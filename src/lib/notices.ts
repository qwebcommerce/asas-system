export const noticeKinds = ["documentExpiry"] as const;

export type NoticeKind = (typeof noticeKinds)[number];

export type Notice = {
  id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  when: string;
  documentId: string;
  hasFile: boolean;
};
