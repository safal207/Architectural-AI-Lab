import { useEffect, useRef, useState } from 'react';
const media = `${import.meta.env.BASE_URL}editorial/`;
const stories = [
  { title: 'The heart of the home.', category: '01 / Kitchen & living', image: 'interior', alt: 'Fluted timber kitchen island, sculptural stools and a soft neutral living area', description: 'A tactile timber island anchors an open sequence of cooking, conversation and rest.', stop: 'dining', action: 'Explore the kitchen', note: 'Interior concept study' },
  { title: 'Life, open to the sky.', category: '02 / Pool & terrace', image: 'residence', alt: 'Villa glazing and warm stone beside the reflecting pool', description: 'Long horizontal lines and a reflecting pool extend the living space into the landscape.', stop: 'pool', action: 'Explore the terrace', note: 'Pool-side architectural study' },
];

export default function SpaceStories({ onEnter }) {
  const [openIndex, setOpenIndex] = useState(null);
  const dialog = useRef(null);
  const active = openIndex === null ? null : stories[openIndex];
  useEffect(() => {
    if (openIndex !== null && !dialog.current.open) dialog.current.showModal();
    if (openIndex === null && dialog.current.open) dialog.current.close();
  }, [openIndex]);
  return (
    <section className="spaces-section section-wrap" id="spaces" aria-labelledby="spaces-title">
      <div className="section-intro"><div><p className="eyebrow">01 / A sense of place</p><h2 id="spaces-title">Less noise.<br /><em>More life.</em></h2></div><div className="section-intro__text"><p>The residence unfolds as a sequence of sheltered, light-filled spaces. Warm stone and timber bring continuity; glass opens the home to the water beyond.</p><div className="project-facts"><div><strong>02</strong><span>Connected levels</span></div><div><strong>03</strong><span>Featured spaces</span></div><div><strong>360°</strong><span>Interactive views</span></div></div></div></div>
      <div className="space-stories">
        {stories.map((story, index) => <article className="space-story" key={story.image}>
          <button className="space-story__image" type="button" onClick={() => setOpenIndex(index)} aria-label={`Enlarge ${story.category.split(' / ')[1]} image`}>
            <img src={`${media}${story.image}-800.webp`} srcSet={`${media}${story.image}-800.webp 800w, ${media}${story.image}-1600.webp 1600w`} sizes="(max-width: 700px) 100vw, 55vw" width="1600" height="900" loading="lazy" alt={story.alt} />
            <span className="image-expand" aria-hidden="true">↗</span>
            <span className="image-note">{story.note}</span>
          </button>
          <div className="space-story__copy"><p className="eyebrow">{story.category}</p><h3>{story.title}</h3><p>{story.description}</p><button className="text-link" type="button" onClick={() => onEnter(story.stop)}>{story.action} <span aria-hidden="true">↗</span></button></div>
        </article>)}
      </div>
      <dialog ref={dialog} className="image-dialog" aria-label="Residence image gallery" onCancel={() => setOpenIndex(null)} onClose={() => setOpenIndex(null)} onClick={(event) => { if (event.target === dialog.current) setOpenIndex(null); }} onKeyDown={(event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); setOpenIndex((index) => (index + 1) % stories.length); } }}>
        {active && <><div className="image-dialog__bar"><span>{active.note}</span><button type="button" autoFocus onClick={() => setOpenIndex(null)} aria-label="Close image gallery">Close ×</button></div><img src={`${media}${active.image}-1600.webp`} alt={active.alt} /><div className="image-dialog__bottom"><button type="button" onClick={() => setOpenIndex((openIndex + stories.length - 1) % stories.length)} aria-label="Previous image">←</button><span>{String(openIndex + 1).padStart(2, '0')} / 02 · {active.title}</span><button type="button" onClick={() => setOpenIndex((openIndex + 1) % stories.length)} aria-label="Next image">→</button></div></>}
      </dialog>
    </section>
  );
}
