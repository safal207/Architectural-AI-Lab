import { useEffect, useState } from 'react';

const chapters = [
  ['design', 'Concept'], ['spaces', 'Spaces'], ['viewer', '3D studio'],
  ['journey', 'Plan'], ['brief', 'Brief'],
];

export default function ProjectChapters() {
  const [active, setActive] = useState('design');
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = chapters[0][0];
      for (const [id] of chapters) {
        if ((document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= 150) current = id;
      }
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) current = chapters.at(-1)[0];
      setActive(current);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <nav className="project-chapters" aria-label="Project chapters">
      <a className="project-chapters__name" href="#top">Dubai residence <span>001</span></a>
      <div>{chapters.map(([id, label], index) => (
        <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined}>
          <span aria-hidden="true">0{index + 1}</span>{label}
        </a>
      ))}</div>
    </nav>
  );
}
