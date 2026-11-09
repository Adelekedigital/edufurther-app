import { BrandLogo } from '@/components/atoms/BrandLogo/BrandLogo';
import { EMAIL_EDITOR as C } from '@/lib/copy/adminEmails';
import styles from './EmailPreview.module.css';

type Props = {
  /** The three lines as sent with the variant's sample data (a line it lacks: null). */
  subject: string;
  heading: string;
  button: string | null;
  sampleName: string;
  sampleSession?: string;
  sampleEmail: string;
};

/**
 * Admin Emails.dc.html preview: the inbox line, then the email frame with the
 * template's body as grey bars. Updates as the admin types.
 */
export function EmailPreview({
  subject,
  heading,
  button,
  sampleName,
  sampleSession,
  sampleEmail,
}: Props) {
  return (
    <aside aria-label={C.preview.title} className={styles.preview}>
      <div className={styles.top}>
        <h2 className={styles.title}>{C.preview.title}</h2>
        <span className={styles.sample}>{C.preview.sample(sampleName, sampleSession)}</span>
      </div>
      <div className={styles.frame}>
        <div className={styles.inbox}>
          <span className={styles.from}>{C.preview.from(sampleEmail)}</span>
          <span className={styles.subject}>{subject}</span>
        </div>
        <div className={styles.email}>
          <BrandLogo alt="EduFurther" height={20} width={150} className={styles.logo} />
          <span className={styles.heading}>{heading}</span>
          <div role="img" aria-label={C.preview.body} className={styles.bars}>
            <span />
            <span />
            <span />
          </div>
          {button?.trim() && <span className={styles.button}>{button}</span>}
        </div>
      </div>
      <span className={styles.note}>{C.preview.note}</span>
    </aside>
  );
}
