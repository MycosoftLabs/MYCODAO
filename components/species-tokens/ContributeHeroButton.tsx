"use client";

import styles from "./species-tokens.module.css";

export function ContributeHeroButton() {
  return (
    <a
      href="#contribute"
      className={styles.primary}
      onClick={(event) => {
        event.preventDefault();
        window.location.hash = "contribute";
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }}
    >
      Contribute an observation <span aria-hidden="true">↗</span>
    </a>
  );
}
