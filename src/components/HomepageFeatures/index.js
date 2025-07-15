import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';
import MountainSvg from '@site/static/img/undraw_docusaurus_mountain.svg';
import TreeSvg from '@site/static/img/undraw_docusaurus_tree.svg';
import ReactSvg from '@site/static/img/undraw_docusaurus_react.svg';
// Add more SVGs for new features
import TagSvg from '@site/static/img/undraw_docusaurus_tree.svg'; // Placeholder, replace with actual
import DatabaseSvg from '@site/static/img/undraw_docusaurus_mountain.svg'; // Placeholder, replace with actual
import KeySvg from '@site/static/img/undraw_docusaurus_tree.svg'; // Placeholder, replace with actual

const FeatureList = [
  {
    title: 'AI-Powered Conversion',
    Svg: MountainSvg,
    description: (
      <>
        Advanced NLP transforms documents into clean, structured Markdown with perfect formatting.
      </>
    ),
  },
  {
    title: 'Role-Based Access',
    Svg: KeySvg,
    description: (
      <>
        Granular permissions for Admins, Editors, and Viewers with audit logging.
      </>
    ),
  },
  {
    title: 'Multi-Framework',
    Svg: ReactSvg,
    description: (
      <>
        Unified dashboard supporting Angular and Docusaurus workflows.
      </>
    ),
  },
  {
    title: 'Smart Tagging',
    Svg: TagSvg,
    description: (
      <>
        Auto-categorization of content as API, Tutorial, or Guide documentation.
      </>
    ),
  },
  {
    title: 'PostgreSQL Backend',
    Svg: DatabaseSvg,
    description: (
      <>
        Enterprise-grade database with full version history and rollback.
      </>
    ),
  },
  {
    title: 'Secure & Scalable',
    Svg: TreeSvg,
    description: (
      <>
        Enterprise-grade security, scalability, and compliance for your documentation workflows.
      </>
    ),
  },
];

function Feature({ Svg, title, description }) {
  return (
    <div className={styles.featureCard}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className={styles.featuresContainer}>
        {FeatureList.map((props, idx) => (
          <Feature key={idx} {...props} />
        ))}
      </div>
    </section>
  );
}
