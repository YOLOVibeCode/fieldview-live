const OPERATOR_NAME = 'Noctusoft, Inc.';
const OPERATOR_URL = 'https://noctusoft.com';

export interface OperatedByProps {
  className?: string;
}

/**
 * Names the company behind FieldView.Live. Carrier reviewers (Twilio
 * toll-free verification) match the contact email's domain to this operator,
 * so it appears in the site footer and at the top of each policy page.
 */
export function OperatedBy({ className }: OperatedByProps) {
  return (
    <p className={className} data-testid="text-operated-by">
      FieldView.Live is operated by {OPERATOR_NAME} (
      <a href={OPERATOR_URL} className="underline underline-offset-4 hover:text-foreground" data-testid="link-operator">
        {OPERATOR_URL}
      </a>
      )
    </p>
  );
}
