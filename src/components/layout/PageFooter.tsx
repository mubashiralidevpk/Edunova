import { Link } from 'react-router-dom';

export function PageFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border/70 bg-background/50 backdrop-blur-sm py-6 px-4 lg:px-8">
      <div className="mx-auto max-w-[1400px] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground/80">
        <span>Created by Mubashir Ali, IMCB H-9, N-11, 26HS043</span>
        <span>© {year} Edunova — Management Intelligence System</span>
        <div className="flex items-center gap-4">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <Link to="/admissions" className="hover:text-primary transition-colors">Admissions</Link>
          <Link to="/results" className="hover:text-primary transition-colors">Results</Link>
          <Link to="/auth/login" className="hover:text-primary transition-colors">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}
