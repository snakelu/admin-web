/** 数据为空时的轻量纸艺空态。 */
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <section className="card empty">
      <div className="empty-art" aria-hidden="true">
        <span className="empty-sheet"></span>
        <span className="empty-pencil"></span>
      </div>
      <h2 className="empty-title">{title}</h2>
      <p className="empty-text">{text}</p>
    </section>
  );
}
