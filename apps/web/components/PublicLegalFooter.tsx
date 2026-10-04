import Link from 'next/link';

export function PublicLegalFooter() {
  return (
    <footer
      className="mt-auto border-t bg-muted/30 py-4 px-4 text-center text-sm text-muted-foreground"
      data-testid="footer-public-legal"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-2 sm:flex-row sm:gap-6">
        <span>© {new Date().getFullYear()} FieldView.Live</span>
        <nav className="flex gap-4" aria-label="Legal">
          <Link href="/privacy" data-testid="link-privacy" className="hover:text-foreground underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" data-testid="link-terms" className="hover:text-foreground underline-offset-4 hover:underline">
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
}
