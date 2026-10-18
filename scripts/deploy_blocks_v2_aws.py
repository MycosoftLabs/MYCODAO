"""Deploy Blocks v2 as a SEPARATE ECS service next to live v1 (Oct 17, 2026).

Creates or updates, without touching v1 (service `mycodao-blocks`, image tag `latest`):
  - task definition family `mycodao-blocks-v2` (cloned from v1's current task def, new image + env)
  - target group `mycodao-blocks-v2` (port 3004)
  - ALB host rules `blocks-v2.mycodao.com` on the existing mycodao-blocks ALB (80 + 443)
  - ECS service `mycodao-blocks-v2` on cluster `mycosoft-website`
Reads AWS keys from the environment (load MAS .credentials.local first). Usage:
  python scripts/deploy_blocks_v2_aws.py <image-tag>
"""

from __future__ import annotations

import json
import sys
import time

import boto3

REGION = "us-east-1"
ACCOUNT = "376129856177"
CLUSTER = "mycosoft-website"
V1_SERVICE = "mycodao-blocks"
V2_SERVICE = "mycodao-blocks-v2"
V2_FAMILY = "mycodao-blocks-v2"
V2_TG = "mycodao-blocks-v2"
V2_HOST = "blocks-v2.mycodao.com"
ALB_NAME = "mycodao-blocks"
REPO = f"{ACCOUNT}.dkr.ecr.{REGION}.amazonaws.com/mycosoft/mycodao-blocks"
V2_ENV = {
    "MINDEX_API_URL": "http://mindex-internal.mycosoft.com:8000",
    "MYCODAO_V1_SOURCE": "auto",
    "BLOCKS_RELEASE": "v2-preview",
    "BLOCKS_PUBLIC_BASE_URL": "https://blocks-v2.mycodao.com",
    # v1 owns producer automation; the v2 preview must not run the same calendar/scheduler jobs.
    "BLOCKS_CALENDAR_AUTO_IMPORT": "0",
}

ecs = boto3.client("ecs", region_name=REGION)
elbv2 = boto3.client("elbv2", region_name=REGION)

TD_KEYS = (
    "containerDefinitions", "taskRoleArn", "executionRoleArn", "networkMode", "volumes",
    "placementConstraints", "requiresCompatibilities", "cpu", "memory", "runtimePlatform", "ephemeralStorage",
)


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def register_task_def(tag: str) -> str:
    v1 = ecs.describe_services(cluster=CLUSTER, services=[V1_SERVICE])["services"][0]
    src = ecs.describe_task_definition(taskDefinition=v1["taskDefinition"])["taskDefinition"]
    td = {k: src[k] for k in TD_KEYS if k in src}
    for c in td["containerDefinitions"]:
        c["image"] = f"{REPO}:{tag}"
        env = {e["name"]: e["value"] for e in c.get("environment", [])}
        env.update(V2_ENV)
        c["environment"] = [{"name": k, "value": v} for k, v in env.items()]
        lc = c.get("logConfiguration", {}).get("options", {})
        if "awslogs-stream-prefix" in lc:
            lc["awslogs-stream-prefix"] = "blocks-v2"
    arn = ecs.register_task_definition(family=V2_FAMILY, **td)["taskDefinition"]["taskDefinitionArn"]
    log(f"task definition {arn} (cloned from {src['taskDefinitionArn'].split('/')[-1]})")
    return arn


def ensure_target_group(v1_tg_arn: str) -> str:
    v1_tg = elbv2.describe_target_groups(TargetGroupArns=[v1_tg_arn])["TargetGroups"][0]
    try:
        tg = elbv2.describe_target_groups(Names=[V2_TG])["TargetGroups"][0]
        log(f"target group exists {tg['TargetGroupArn']}")
    except elbv2.exceptions.TargetGroupNotFoundException:
        tg = elbv2.create_target_group(
            Name=V2_TG, Protocol="HTTP", Port=v1_tg["Port"], VpcId=v1_tg["VpcId"], TargetType=v1_tg["TargetType"],
            HealthCheckPath="/v2", HealthCheckIntervalSeconds=30, HealthyThresholdCount=2, UnhealthyThresholdCount=5,
            Matcher={"HttpCode": "200-399"},
        )["TargetGroups"][0]
        log(f"created target group {tg['TargetGroupArn']}")
    return tg["TargetGroupArn"]


def ensure_host_rules(tg_arn: str) -> None:
    alb = elbv2.describe_load_balancers(Names=[ALB_NAME])["LoadBalancers"][0]
    for listener in elbv2.describe_listeners(LoadBalancerArn=alb["LoadBalancerArn"])["Listeners"]:
        rules = elbv2.describe_rules(ListenerArn=listener["ListenerArn"])["Rules"]
        exists = any(
            V2_HOST in (cond.get("HostHeaderConfig", {}).get("Values") or cond.get("Values") or [])
            for r in rules for cond in r.get("Conditions", [])
        )
        if exists:
            log(f"host rule exists on :{listener['Port']}")
            continue
        used = {int(r["Priority"]) for r in rules if r["Priority"].isdigit()}
        priority = next(p for p in range(5, 50000) if p not in used)
        elbv2.create_rule(
            ListenerArn=listener["ListenerArn"], Priority=priority,
            Conditions=[{"Field": "host-header", "HostHeaderConfig": {"Values": [V2_HOST]}}],
            Actions=[{"Type": "forward", "TargetGroupArn": tg_arn}],
        )
        log(f"created host rule {V2_HOST} -> v2 on :{listener['Port']} (priority {priority})")


def ensure_service(td_arn: str, tg_arn: str, v1: dict) -> None:
    container = ecs.describe_task_definition(taskDefinition=td_arn)["taskDefinition"]["containerDefinitions"][0]
    existing = ecs.describe_services(cluster=CLUSTER, services=[V2_SERVICE])["services"]
    if existing and existing[0]["status"] == "ACTIVE":
        ecs.update_service(cluster=CLUSTER, service=V2_SERVICE, taskDefinition=td_arn, desiredCount=1, forceNewDeployment=True)
        log("updated service mycodao-blocks-v2")
    else:
        ecs.create_service(
            cluster=CLUSTER, serviceName=V2_SERVICE, taskDefinition=td_arn, desiredCount=1,
            launchType=v1.get("launchType", "FARGATE"),
            networkConfiguration=v1["networkConfiguration"],
            loadBalancers=[{"targetGroupArn": tg_arn, "containerName": container["name"], "containerPort": 3004}],
            healthCheckGracePeriodSeconds=120,
            deploymentConfiguration={"minimumHealthyPercent": 0, "maximumPercent": 200},
        )
        log("created service mycodao-blocks-v2")
    log("waiting for service to be stable…")
    ecs.get_waiter("services_stable").wait(cluster=CLUSTER, services=[V2_SERVICE], WaiterConfig={"Delay": 15, "MaxAttempts": 60})
    svc = ecs.describe_services(cluster=CLUSTER, services=[V2_SERVICE])["services"][0]
    log(f"stable: running={svc['runningCount']} desired={svc['desiredCount']}")


def main() -> None:
    tag = sys.argv[1]
    v1 = ecs.describe_services(cluster=CLUSTER, services=[V1_SERVICE])["services"][0]
    v1_tg_arn = v1["loadBalancers"][0]["targetGroupArn"]
    td_arn = register_task_def(tag)
    tg_arn = ensure_target_group(v1_tg_arn)
    ensure_host_rules(tg_arn)
    ensure_service(td_arn, tg_arn, v1)
    v1_after = ecs.describe_services(cluster=CLUSTER, services=[V1_SERVICE])["services"][0]
    print(json.dumps({
        "v2_service": V2_SERVICE, "v2_task_definition": td_arn, "v2_target_group": tg_arn, "v2_host": V2_HOST,
        "v1_task_definition_unchanged": v1_after["taskDefinition"] == v1["taskDefinition"],
        "v1_running": v1_after["runningCount"],
    }, indent=2))


if __name__ == "__main__":
    main()
