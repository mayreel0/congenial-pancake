type PushAppOnlyNoticeProps = {
  subscribed: boolean;
};

export function PushAppOnlyNotice({ subscribed }: PushAppOnlyNoticeProps) {
  return (
    <section className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">푸시 알림</h2>
      <p className="text-xs text-muted">
        푸시 알림은 온설을 앱으로 설치해서 이용할 때 켜고 끌 수 있어요.
      </p>
      {subscribed && (
        <p className="text-xs text-foreground">
          지금은 켜져 있어요. 끄려면 앱에서 이 화면을 열어주세요.
        </p>
      )}
    </section>
  );
}
