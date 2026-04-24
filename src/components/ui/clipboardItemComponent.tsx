export default function ClipboardItemComponent({
  content,
}: {
  content: string;
}) {
  return (
    <div className="p-4 border rounded-md bg-muted">
      <p className="text-sm text-foreground">{content}</p>
    </div>
  );
}
