import type { ReactNode } from "react";

/** Tag renderers shared by the site's rich messages: <br></br> and <b>…</b> */
export const richTags = {
  br: () => <br />,
  b: (chunks: ReactNode) => <strong>{chunks}</strong>,
};
