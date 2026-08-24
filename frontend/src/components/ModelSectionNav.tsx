import { useEffect, useRef, useState } from 'react';

export interface ModelSectionLink {
  id: string;
  label: string;
  index: string;
}

interface ModelSectionNavProps {
  sections: readonly ModelSectionLink[];
  modelSlug: string;
  modelName: string;
  modelIndex: string;
}

export function ModelSectionNav({
  sections,
  modelSlug,
  modelName,
  modelIndex,
}: ModelSectionNavProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? 'overview');
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const parts = window.location.hash.replace(/^#\/?/, '').split('/');
    const requestedSection = ['learn', 'explore', 'calibrate'].includes(parts[0] ?? '')
      ? parts[1]
      : parts[2];
    if (!requestedSection || !sections.some((section) => section.id === requestedSection)) return;

    window.requestAnimationFrame(() => {
      document
        .getElementById(requestedSection)
        ?.scrollIntoView({ behavior: 'auto', block: 'start' });
      setActiveSection(requestedSection);
    });
  }, [sections]);

  useEffect(() => {
    const list = listRef.current;
    const activeLink = list?.querySelector<HTMLElement>('a.active');
    if (!list || !activeLink || !window.matchMedia('(max-width: 820px)').matches) return;

    const left = activeLink.offsetLeft - (list.clientWidth - activeLink.offsetWidth) / 2;
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';
    list.scrollTo({ left: Math.max(0, left), behavior });
  }, [activeSection]);

  useEffect(() => {
    const elements = sections
      .map(({ id }) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
        if (visible[0]?.target.id) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-18% 0px -68% 0px', threshold: [0, 0.2, 0.6] },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections]);

  function navigateToSection(id: string) {
    const element = document.getElementById(id);
    if (!element) return;

    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';
    element.scrollIntoView({ behavior, block: 'start' });
    window.history.replaceState(null, '', `#/${modelSlug}/learn/${id}`);
    setActiveSection(id);
  }

  return (
    <aside className="model-section-rail">
      <nav className="model-section-nav" aria-label={`${modelName} explanation sections`}>
        <div className="section-nav-heading">
          <span>Model {modelIndex}</span>
          <strong>On this page</strong>
        </div>
        <ol ref={listRef}>
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#/${modelSlug}/learn/${section.id}`}
                className={activeSection === section.id ? 'active' : ''}
                aria-current={activeSection === section.id ? 'location' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  navigateToSection(section.id);
                }}
              >
                <span>{section.index}</span>
                {section.label}
              </a>
            </li>
          ))}
        </ol>
        <p className="section-nav-progress" aria-live="polite">
          {sections.findIndex((section) => section.id === activeSection) + 1} / {sections.length}
        </p>
      </nav>
    </aside>
  );
}
