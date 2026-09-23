import { useEffect, useRef, useState } from 'react';
import './SpaceStories.css';
const media = `${import.meta.env.BASE_URL}editorial/`;
const stories = [
  { title: 'The everyday, reimagined.', category: '01 / Kitchen & living', image: 'interior', alt: 'Concept visualisation with a fluted timber kitchen island, sculptural stools and a soft neutral living area', description: 'Picture the first coffee at a tactile timber island, with cooking, conversation and rest in one connected space.', stop: 'dining', action: 'Explore the kitchen', note: 'Interior concept visualisation', details: ['Fluted timber island', 'Pendant lighting', 'Open living'] },
  { title: 'Evenings open to the sky.', category: '02 / Pool & terrace', image: 'residence', alt: 'Concept visualisation of villa glazing and warm stone beside a reflecting pool', description: 'The terrace carries the living room towards the water. Warm materials and a broad view give the imagined evening room to breathe.', stop: 'pool', action: 'Explore the terrace', note: 'Exterior concept visualisation', details: ['Reflecting pool', 'Low planting', 'Glazed threshold'] },
];

/**
 * Link kitchen and terrace stories to 3D and a native modal image gallery.
 * Keep image selection local and support arrow navigation, Escape and native focus restoration.
 */
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
      <div className="section-intro"><div><p className="eyebrow">02 / Rooms for living</p><h2 id="spaces-title">Gather inside.<br /><em>Unwind outside.</em></h2></div><div className="section-intro__text"><p>These are two scenes from the Dubai residence concept. See how material, light and the route between spaces shape the feeling of a home.</p><p className="spaces-evidence">Open a visualisation for detail, or enter the 3D study to explore its current model.</p></div></div>
      <div className="space-stories">
        {stories.map((story, index) => <article className="space-story" key={story.image}>
          <button className="space-story__image" type="button" onClick={() => setOpenIndex(index)} aria-label={`Enlarge ${story.category.split(' / ')[1]} image`}>
            <img src={`${media}${story.image}-800.webp`} srcSet={`${media}${story.image}-800.webp 800w, ${media}${story.image}-1600.webp 1600w`} sizes="(max-width: 700px) 100vw, 55vw" width="1600" height="900" loading="lazy" alt={story.alt} />
            <span className="image-expand" aria-hidden="true">↗</span>
            <span className="image-note">{story.note}</span>
          </button>
          <div className="space-story__copy"><p className="eyebrow">{story.category}</p><h3>{story.title}</h3><p>{story.description}</p><div className="space-story__details">{story.details.map((detail) => <span key={detail}>{detail}</span>)}</div><button className="text-link" type="button" onClick={() => onEnter(story.stop)}>{story.action} <span aria-hidden="true">↗</span></button></div>
        </article>)}
      </div>
      <div className="spaces-next">
        <div><p className="eyebrow">Your space could be next</p><p>Start with a kitchen, a living room or the corner you have been imagining. Tell us what should change and what you want to feel there.</p></div>
        <a href="#brief">Start with your space <span aria-hidden="true">↗</span></a>
      </div>
      <dialog ref={dialog} className="image-dialog" aria-label="Residence image gallery" onCancel={() => setOpenIndex(null)} onClose={() => setOpenIndex(null)} onClick={(event) => { if (event.target === dialog.current) setOpenIndex(null); }} onKeyDown={(event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); const step = event.key === 'ArrowRight' ? 1 : -1; setOpenIndex((index) => (index + step + stories.length) % stories.length); } }}>
        {active && <><div className="image-dialog__bar"><span>{active.note}</span><button type="button" autoFocus onClick={() => setOpenIndex(null)} aria-label="Close image gallery">Close ×</button></div><img src={`${media}${active.image}-1600.webp`} alt={active.alt} /><div className="image-dialog__bottom"><button type="button" onClick={() => setOpenIndex((openIndex + stories.length - 1) % stories.length)} aria-label="Previous image">←</button><span>{String(openIndex + 1).padStart(2, '0')} / 02 · {active.title}</span><button type="button" onClick={() => setOpenIndex((openIndex + 1) % stories.length)} aria-label="Next image">→</button></div></>}
      </dialog>
    </section>
  );
}
