// Shows ?error= / ?message= passed back by Server Actions.
export function Flash({ error, message }: { error?: string; message?: string }) {
  return (
    <>
      {error && <p className="flash flash-error">{error}</p>}
      {message && <p className="flash flash-ok">{message}</p>}
    </>
  );
}
