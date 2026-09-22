import { useEffect, useRef, useState } from 'react';
const media = `${import.meta.env.BASE_URL}editorial/`;
const stories = [
  { title: 'The heart of the home.', category: '01 / Kitchen & living', image: 'interior', alt: 'Fluted timber kitchen island, sculptural stools and a soft neutral living area', description: 'A tactile timber island anchors an open sequence of cooking, conversation and rest.', stop: 'dining', action: 'Explore the kitchen', note: 'Interior concept study', details: ['Fluted timber island', 'Pendant lighting', 'Open living'] },
  { title: 'Life, open to the sky.', category: '02 / Pool & terrace', image: 'residence', alt: 'Villa glazing and warm stone beside the reflecting pool', description: 'Long horizontal lines and a reflecting pool extend the living space into the landscape.', stop: 'pool', action: 'Explore the terrace', note: 'Pool-side architectural study', details: ['Infinity edge', 'Low planting', 'Glazed threshold'] },
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
      <div className="section-intro"><div><p className="eyebrow">02 / Rooms for living</p><h2 id="spaces-title">Gather inside.<br /><em>Unwind outside.</em></h2></div><div className="section-intro__text"><p>The kitchen island brings cooking and conversation together. Beyond the glazed living room, the terrace carries the same horizontal lines towards the pool.</p><p className="spaces-evidence">Two studies from the project archive. Enter either space to explore the current model.</p></div></div>
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
      <dialog ref={dialog} className="image-dialog" aria-label="Residence image gallery" onCancel={() => setOpenIndex(null)} onClose={() => setOpenIndex(null)} onClick={(event) => { if (event.target === dialog.current) setOpenIndex(null); }} onKeyDown={(event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); const step = event.key === 'ArrowRight' ? 1 : -1; setOpenIndex((index) => (index + step + stories.length) % stories.length); } }}>
        {active && <><div className="image-dialog__bar"><span>{active.note}</span><button type="button" autoFocus onClick={() => setOpenIndex(null)} aria-label="Close image gallery">Close ×</button></div><img src={`${media}${active.image}-1600.webp`} alt={active.alt} /><div className="image-dialog__bottom"><button type="button" onClick={() => setOpenIndex((openIndex + stories.length - 1) % stories.length)} aria-label="Previous image">←</button><span>{String(openIndex + 1).padStart(2, '0')} / 02 · {active.title}</span><button type="button" onClick={() => setOpenIndex((openIndex + 1) % stories.length)} aria-label="Next image">→</button></div></>}
      </dialog>
    </section>
  );
}
