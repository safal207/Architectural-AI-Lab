import { useEffect, useRef, useState } from 'react';
import './ProjectBrief.css';

const PROJECT_TYPES = {
  'Villa architecture': {
    areaHint: 'Home floor area, rather than plot size.',
    areaPlaceholder: 'e.g. 320',
    scopes: ['New villa concept', 'Existing villa renovation', 'Façade and outdoor spaces', 'Layout study'],
    nextDetail: 'Site plan, orientation and access'
  },
  'Kitchen design': {
    areaHint: 'Floor area of the kitchen.',
    areaPlaceholder: 'e.g. 24',
    scopes: ['Complete kitchen', 'Layout and storage', 'Finishes and lighting', 'Refresh an existing kitchen'],
    nextDetail: 'Kitchen dimensions, appliances and service points'
  },
  'Home interiors': {
    areaHint: 'Area included in the interior project.',
    areaPlaceholder: 'e.g. 120',
    scopes: ['Whole-home interiors', 'One room', 'Several rooms', 'Finishes and furnishings'],
    nextDetail: 'Measured room plans and existing features to retain'
  }
};

const PRIORITIES = ['Natural light', 'Generous storage', 'Natural materials', 'Easy upkeep'];
const OPTIONAL_IDEAS = [
  { id: 'room-views', label: 'Additional room views', description: 'See more spaces or viewpoints.' },
  { id: 'material-lighting', label: 'Materials and lighting exploration', description: 'Compare possible moods and finishes.' },
  { id: 'walkthrough', label: 'Interactive 3D walkthrough', description: 'Discuss a navigable concept model.' }
];
const CONTACT_EMAIL = 'safal0645@gmail.com';
const CONTACT_TELEGRAM = 'https://t.me/Alexfox14';

/** Use one text source for the download, email draft and copy action. */
function createBrief({ projectType, location, area, scope, priorities, optionalIdeas, notes, category, material, lighting, inspirationSpace }) {
  const selectedPriorities = PRIORITIES.filter((priority) => priorities.includes(priority));
  const selectedIdeas = OPTIONAL_IDEAS.filter((idea) => optionalIdeas.includes(idea.id)).map((idea) => idea.label);
  return [
    'ARCHITECTURAL AI LAB / PROJECT BRIEF', '',
    `Project: ${projectType}`,
    `Location: ${location.trim() || 'To be defined.'}`,
    `Scope: ${scope || 'To be defined.'}`,
    `Approximate area: ${area ? `${Number(area)} m²` : 'To be measured.'}`,
    `Area reference: ${category.areaHint}`,
    `Priorities: ${selectedPriorities.length ? selectedPriorities.join('; ') : 'To be discussed.'}`,
    `Optional ideas to discuss: ${selectedIdeas.length ? selectedIdeas.join('; ') : 'None selected.'}`,
    'We can confirm scope and pricing together after reviewing this brief.', '',
    'Reference: Dubai residence — Desert, distilled.',
    ...(inspirationSpace ? [`Space explored in 3D: ${inspirationSpace}`] : []),
    `Material direction: ${material?.name ?? 'Original villa materials'}`,
    'Palette status: Concept reference only; not a material specification.',
    `Preferred atmosphere: ${lighting}`, '',
    'Your ideas:', notes.trim() || 'To be discussed.', '',
    'Next details to define:',
    ...(!location.trim() ? ['Project location'] : []),
    category.nextDetail,
    ...(!scope ? ['Project scope and required spaces'] : []),
    'Household needs and daily routines',
    'Budget range and target date',
    'Reference images and preferred materials', '',
    'Concept planning brief. Not construction documentation.',
  ].join('\n');
}

/**
 * Collect shared project details and category-specific area/scope for a local brief.
 * The visitor explicitly opens their email app or copies the text; this site stores and sends nothing.
 */
export default function ProjectBrief({ material, lighting, inspirationSpace = null }) {
  const [projectType, setProjectType] = useState('Kitchen design');
  const [location, setLocation] = useState('');
  const [detailsByType, setDetailsByType] = useState(() => Object.fromEntries(
    Object.keys(PROJECT_TYPES).map((type) => [type, { area: '', scope: '' }])
  ));
  const [priorities, setPriorities] = useState([]);
  const [optionalIdeas, setOptionalIdeas] = useState([]);
  const [notes, setNotes] = useState('');
  const [prepared, setPrepared] = useState(false);
  const [contactNotice, setContactNotice] = useState('');
  const firstProjectTypeRef = useRef(null);
  const notesRef = useRef(null);
  const category = PROJECT_TYPES[projectType];
  const { area, scope } = detailsByType[projectType];
  const briefContent = createBrief({ projectType, location, area, scope, priorities, optionalIdeas, notes, category, material, lighting, inspirationSpace });
  const selectedIdeas = OPTIONAL_IDEAS.filter((idea) => optionalIdeas.includes(idea.id));
  const emailSubjectHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Project enquiry — ${projectType}`)}`;
  const emailHref = `${emailSubjectHref}&body=${encodeURIComponent(briefContent.replace(/\n/g, '\r\n'))}`;
  const emailNeedsCopy = emailHref.length > 1800;

  useEffect(() => { setPrepared(false); setContactNotice(''); }, [
    projectType, location, area, scope, priorities, optionalIdeas, notes, material?.id, material?.name, lighting, inspirationSpace
  ]);

  /** Update one detail in the active project category while retaining the other categories' drafts. */
  function updateProjectDetail(field, value) {
    setDetailsByType((current) => ({
      ...current,
      [projectType]: { ...current[projectType], [field]: value }
    }));
  }

  /** Add or remove one priority without discarding the other selected priorities. */
  function togglePriority(priority) {
    setPriorities((current) => current.includes(priority)
      ? current.filter((item) => item !== priority)
      : [...current, priority]);
  }

  function toggleOptionalIdea(id) {
    setOptionalIdeas((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }

  /** Keep contact actions useful and prevent a blank or invalid request from opening. */
  function validateContact(event) {
    if (!event.currentTarget.closest('form')?.reportValidity()) {
      event.preventDefault();
      return false;
    }
    if (!location.trim() && !area && !scope && priorities.length === 0 && optionalIdeas.length === 0 && !notes.trim()) {
      event.preventDefault();
      setContactNotice('Add one detail about your project before opening a message.');
      notesRef.current?.focus();
      return false;
    }
    return true;
  }

  /** Copy the complete brief for a Telegram message or an email that exceeds safe URL length. */
  async function copyBrief(event, destination = 'Telegram') {
    if (!validateContact(event)) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(briefContent);
    } catch {
      const fallback = document.createElement('textarea');
      fallback.value = briefContent;
      fallback.setAttribute('readonly', '');
      fallback.style.position = 'fixed';
      fallback.style.opacity = '0';
      document.body.appendChild(fallback);
      fallback.select();
      let copied = false;
      try { copied = document.execCommand?.('copy') === true; }
      catch { copied = false; }
      finally { fallback.remove(); }
      if (!copied) {
        setContactNotice(`Copy is unavailable here. Download the brief and paste its text into ${destination}.`);
        return;
      }
    }
    setContactNotice(destination === 'email'
      ? 'Brief copied. Open the email draft, paste the full text and press Send there.'
      : 'Brief copied. Open Telegram and paste it into your message to @Alexfox14.');
  }

  /**
   * Validate the form, download the current brief as UTF-8 text and mark it prepared.
   * Create a temporary object URL and revoke it after the browser has started the download.
   */
  function downloadBrief(event) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const url = URL.createObjectURL(new Blob([briefContent], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'architectural-ai-lab-project-brief.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setContactNotice('');
    setPrepared(true);
  }
  return (
    <section className="project-brief section-wrap" id="brief" aria-labelledby="brief-title">
      <div><p className="eyebrow">05 / Your next space</p><h2 id="brief-title">Every home starts<br />with <em>a feeling.</em></h2><p>Start a custom concept and 3D visualization for a villa, kitchen or home interior. Tell us what you have in mind so we can discuss the scope and visual direction.</p><span className="brief-note">Your answers stay on this page while it is open. Nothing is sent by the site; choose to email, copy or download your brief. No account is needed.</span></div>
      <form onSubmit={downloadBrief}>
        <fieldset><legend>What would you like to create?</legend><div className="brief-types">{Object.keys(PROJECT_TYPES).map((type, index) => <label key={type}><input ref={index === 0 ? firstProjectTypeRef : undefined} type="radio" name="project-type" value={type} checked={projectType === type} onChange={() => setProjectType(type)} /><span>{type}</span></label>)}</div></fieldset>
        <div className="brief-project-fields">
          <div className="brief-field">
            <label className="brief-label" htmlFor="project-location">Location <span>Optional</span></label>
            <input id="project-location" type="text" maxLength={120} autoComplete="address-level2" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City or region" />
          </div>
          <div className="brief-field">
            <label className="brief-label" htmlFor="project-area">Approximate area <span>m² · Optional</span></label>
            <input id="project-area" type="number" inputMode="decimal" min="1" max="100000" step="any" value={area} onChange={(event) => updateProjectDetail('area', event.target.value)} placeholder={category.areaPlaceholder} aria-describedby="project-area-hint" />
          </div>
          <p className="brief-field-hint" id="project-area-hint">{category.areaHint}</p>
          <div className="brief-field brief-field--full">
            <label className="brief-label" htmlFor="project-scope">Where shall we begin? <span>Optional</span></label>
            <select id="project-scope" value={scope} onChange={(event) => updateProjectDetail('scope', event.target.value)}>
              <option value="">Not decided yet</option>
              {category.scopes.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
        </div>
        <fieldset className="brief-priorities">
          <legend>What matters most? <span>Choose any</span></legend>
          <div className="brief-priorities__options">
            {PRIORITIES.map((priority) => (
              <label key={priority}>
                <input type="checkbox" checked={priorities.includes(priority)} onChange={() => togglePriority(priority)} />
                <span>{priority}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="brief-optional-ideas">
          <legend>Would you like to explore more? <span>Optional</span></legend>
          <p className="brief-optional-ideas__intro">Choose any ideas you would like to explore together.</p>
          <div className="brief-optional-ideas__options">
            {OPTIONAL_IDEAS.map((idea) => (
              <label key={idea.id}>
                <input type="checkbox" aria-labelledby={`optional-idea-${idea.id}-label`} aria-describedby={`optional-idea-${idea.id}-description`} checked={optionalIdeas.includes(idea.id)} onChange={() => toggleOptionalIdea(idea.id)} />
                <span><strong id={`optional-idea-${idea.id}-label`}>{idea.label}</strong><small id={`optional-idea-${idea.id}-description`}>{idea.description}</small></span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="brief-label" htmlFor="project-notes">What do you have in mind? <span>Optional</span></label>
        <textarea id="project-notes" ref={notesRef} rows="3" maxLength={3000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="A place, a mood, the way you want to live…" />
        <div className="brief-selected"><span>Selected palette · Concept</span><strong>{material?.name ?? 'Original villa materials'}</strong></div>
        {inspirationSpace && <p className="brief-inspiration">Space explored in 3D: <strong>{inspirationSpace}</strong></p>}
        <div className="brief-summary" aria-labelledby="brief-summary-title">
          <div className="brief-summary__header"><h3 id="brief-summary-title">Your enquiry at a glance</h3><button type="button" onClick={() => firstProjectTypeRef.current?.focus()}>Edit choices</button></div>
          <dl>
            <div><dt>Project</dt><dd>{projectType}</dd></div>
            {location.trim() && <div><dt>Location</dt><dd>{location.trim()}</dd></div>}
            <div><dt>Starting point</dt><dd>{scope || 'To be discussed'}</dd></div>
            <div><dt>Area</dt><dd>{area && Number(area) > 0 ? `${Number(area)} m²` : 'To be measured'}</dd></div>
            <div><dt>Priorities</dt><dd>{priorities.length ? PRIORITIES.filter((priority) => priorities.includes(priority)).join(', ') : 'To be discussed'}</dd></div>
            <div><dt>Ideas to discuss</dt><dd>{selectedIdeas.length ? selectedIdeas.map((idea) => idea.label).join(', ') : 'None selected'}</dd></div>
          </dl>
          <p>After you send your brief, we can confirm scope and pricing together.</p>
          <details className="brief-full-preview">
            <summary>Preview the full message</summary>
            <pre>{briefContent}</pre>
          </details>
        </div>
        <div className="brief-next-steps" aria-labelledby="brief-next-steps-title">
          <h3 id="brief-next-steps-title">How to continue</h3>
          <p>Review your choices, then open the email draft or copy the brief for Telegram. You send the message yourself in your email or Telegram app. We can then discuss the project and a tailored proposal.</p>
        </div>
        <div className="brief-actions">
          {emailNeedsCopy ? <>
            <button className="brief-email" type="button" onClick={(event) => copyBrief(event, 'email')}>Copy full brief for email <span aria-hidden="true">↗</span></button>
            <p className="brief-action-note">This detailed brief is too long for a reliable email link. Copy it, open a draft to {CONTACT_EMAIL}, paste the text and send it there.</p>
            <a className="brief-download" href={emailSubjectHref} onClick={validateContact}>Open email draft <span aria-hidden="true">↗</span></a>
          </> : <>
            <a className="brief-email" href={emailHref} onClick={(event) => { if (validateContact(event)) setContactNotice('Your email app should open a draft with this brief. Review it and press Send there.'); }}>Email my project brief <span aria-hidden="true">↗</span></a>
            <p className="brief-action-note">Opens your email app with the brief addressed to {CONTACT_EMAIL}. Review and send it there.</p>
          </>}
          <div className="brief-other-actions">
            <button type="button" onClick={(event) => copyBrief(event)}>Copy brief for Telegram</button>
            <a href={CONTACT_TELEGRAM} target="_blank" rel="noopener noreferrer">Open @Alexfox14 <span aria-hidden="true">↗</span></a>
          </div>
          <button className="brief-download" type="submit">Download my brief <span aria-hidden="true">↓</span></button>
        </div>
        <p className="brief-result" role="status">{contactNotice || (prepared ? 'Your brief is ready. Check your downloads.' : 'Includes your selected materials and atmosphere.')}</p>
      </form>
    </section>
  );
}
