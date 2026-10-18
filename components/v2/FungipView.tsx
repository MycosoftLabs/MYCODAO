import type { FungipOffering } from "@mycodao/sdk";
import { humanize, releaseChip } from "./labels";
import { ActionLink, Definition, EmptyState, StatusChip } from "./primitives";

interface FungipViewProps {
  offerings: FungipOffering[];
  catalogHref: string;
}

export function FungipExplanation({ catalogHref }: { catalogHref: string }) {
  return (
    <div className="grid gap-3 border border-white/10 bg-[#0c0c0c] p-4 text-sm leading-relaxed text-white/70 sm:p-6 sm:text-base">
      <p>
        FungIP is how MycoDAO handles fungal records, materials and services. Dated records and timestamps help show where a
        specimen, culture or dataset came from and who holds it.
      </p>
      <p>Licensing happens only under a named, written agreement that identifies the rights holder and the terms.</p>
      <p className="text-white">No one owns a wild species or its naturally occurring DNA, and none is offered here.</p>
      <div>
        <ActionLink href={catalogHref}>Browse the Tissue Catalog</ActionLink>
      </div>
    </div>
  );
}

export function FungipOfferings({ offerings }: Omit<FungipViewProps, "catalogHref">) {
  if (offerings.length === 0) return <EmptyState message="No FungIP offerings are published yet." />;
  return (
    <>
      <ul className="grid gap-3 md:hidden">
        {offerings.map((offering) => (
          <li key={offering.id} className="border border-white/10 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-white">{offering.title}</p>
              <StatusChip chip={releaseChip(offering.stage)} />
            </div>
            <p className="mt-1 text-sm text-white/60">{offering.description}</p>
            <dl className="mt-3 grid gap-3">
              <Definition label="Type">{humanize(offering.offering_type)}</Definition>
              <Definition label="Rights holder">{offering.rights_holder ?? "Not named yet"}</Definition>
              <Definition label="Permission basis">{offering.permission_basis ?? "Not recorded"}</Definition>
              <Definition label="Disclosure">{humanize(offering.disclosure)}</Definition>
              <Definition label="Inquiries">{offering.inquiry_owner ?? "Not assigned"}</Definition>
            </dl>
            {offering.terms_url ? <ActionLink href={offering.terms_url}>Terms</ActionLink> : null}
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="text-[11px] uppercase tracking-widest text-white/45">
            <tr className="border-b border-white/15">
              <th className="w-[22%] py-2 pr-3 font-semibold">Offering</th>
              <th className="w-[10%] py-2 pr-3 font-semibold">Type</th>
              <th className="w-[18%] py-2 pr-3 font-semibold">Rights holder</th>
              <th className="w-[22%] py-2 pr-3 font-semibold">Permission basis</th>
              <th className="w-[9%] py-2 pr-3 font-semibold">Disclosure</th>
              <th className="w-[9%] py-2 pr-3 font-semibold">Stage</th>
              <th className="w-[10%] py-2 font-semibold">Inquiries</th>
            </tr>
          </thead>
          <tbody>
            {offerings.map((offering) => (
              <tr key={offering.id} className="border-b border-white/10 align-top">
                <td className="py-3 pr-3">
                  <p className="font-semibold text-white">{offering.title}</p>
                  <p className="mt-0.5 text-white/55">{offering.description}</p>
                  {offering.terms_url ? <ActionLink href={offering.terms_url}>Terms</ActionLink> : null}
                </td>
                <td className="py-3 pr-3 text-white/75">{humanize(offering.offering_type)}</td>
                <td className="py-3 pr-3 text-white/75">{offering.rights_holder ?? "Not named yet"}</td>
                <td className="py-3 pr-3 text-white/75">{offering.permission_basis ?? "Not recorded"}</td>
                <td className="py-3 pr-3 text-white/75">{humanize(offering.disclosure)}</td>
                <td className="py-3 pr-3">
                  <StatusChip chip={releaseChip(offering.stage)} />
                </td>
                <td className="py-3 text-white/75">{offering.inquiry_owner ?? "Not assigned"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
