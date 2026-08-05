type RecentComfortExample = {
  id: string;
  body: string;
  replies: Array<{ id: string; body: string }>;
};

type RecentComfortExamplesProps = {
  examples: RecentComfortExample[];
};

const REQUEST_PREVIEW_LENGTH = 160;
const REPLY_PREVIEW_LENGTH = 120;
const REPLY_PREVIEW_LIMIT = 2;

function truncatePreview(body: string, maxLength: number) {
  return body.length > maxLength ? `${body.slice(0, maxLength)}...` : body;
}

export default function RecentComfortExamples({ examples }: RecentComfortExamplesProps) {
  return (
    <section className="comfort-examples" aria-labelledby="recent-comfort-examples-heading">
      <h2 id="recent-comfort-examples-heading">최근 위로</h2>
      {examples.length === 0 ? <p className="muted-copy">아직 공개된 위로가 없어요.</p> : null}
      <div className="comfort-example-list">
        {examples.map((example) => (
          <article key={example.id} className="feed-item">
            <p>{truncatePreview(example.body, REQUEST_PREVIEW_LENGTH)}</p>
            {example.replies.length > 0 ? (
              <div className="comfort-replies" aria-label="남겨진 답변">
                {example.replies.slice(0, REPLY_PREVIEW_LIMIT).map((reply) => <p key={reply.id}>{truncatePreview(reply.body, REPLY_PREVIEW_LENGTH)}</p>)}
              </div>
            ) : (
              <small>아직 답변이 없어요.</small>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
