// pages/[date].js
import { useRouter } from 'next/router';

export default function Day() {
  const { date } = useRouter().query;
  if (!date) return null;
  // public/apps/<date>/index.html をそのまま表示
  return (
    <main style={{height:'100vh',margin:0}}>
      <iframe
        src={`/apps/${date}/index.html`}
        title={String(date)}
        style={{width:'100%',height:'100%',border:'none'}}
      />
    </main>
  );
}
