import styles from './PageHero.module.css';

type PageHeroProps = {
  title: string;
  subtitle: string;
};

/** Blue intro panel at the top of a screen: H1 + one line of context. */
export function PageHero({ title, subtitle }: PageHeroProps) {
  return (
    <section className={styles.hero}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>
    </section>
  );
}
