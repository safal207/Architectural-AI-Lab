import { useEffect, useState } from 'react';
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

export default function ProjectBrief({ material, lighting }) {
  const [projectType, setProjectType] = useState('Villa architecture');
  const [location, setLocation] = useState('');
  const [detailsByType, setDetailsByType] = useState(() => Object.fromEntries(
    Object.keys(PROJECT_TYPES).map((type) => [type, { area: '', scope: '' }])
  ));
  const [priorities, setPriorities] = useState([]);
  const [notes, setNotes] = useState('');
  const [prepared, setPrepared] = useState(false);
  const category = PROJECT_TYPES[projectType];
  const { area, scope } = detailsByType[projectType];

  useEffect(() => setPrepared(false), [
    projectType, location, area, scope, priorities, notes, material?.id, material?.name, lighting
  ]);

  function updateProjectDetail(field, value) {
    setDetailsByType((current) => ({
      ...current,
      [projectType]: { ...current[projectType], [field]: value }
    }));
  }

  function togglePriority(priority) {
    setPriorities((current) => current.includes(priority)
      ? current.filter((item) => item !== priority)
      : [...current, priority]);
  }

  function downloadBrief(event) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const selectedPriorities = PRIORITIES.filter((priority) => priorities.includes(priority));
    const content = [
      'ARCHITECTURAL AI LAB / PROJECT BRIEF', '',
      `Project: ${projectType}`,
      `Location: ${location.trim() || 'To be defined.'}`,
      `Scope: ${scope || 'To be defined.'}`,
      `Approximate area: ${area ? `${Number(area)} m²` : 'To be measured.'}`,
      `Area reference: ${category.areaHint}`,
      `Priorities: ${selectedPriorities.length ? selectedPriorities.join('; ') : 'To be discussed.'}`, '',
      `Reference: Dubai residence — Desert, distilled.`,
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
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'architectural-ai-lab-project-brief.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setPrepared(true);
  }
  return (
    <section className="project-brief section-wrap" id="brief" aria-labelledby="brief-title">
      <div><p className="eyebrow">05 / Your next space</p><h2 id="brief-title">Every home starts<br />with <em>a feeling.</em></h2><p>A villa, a kitchen, a room to call your own. Capture a direction for your project, starting with what speaks to you here.</p><span className="brief-note">Your brief downloads to your device. Nothing is submitted.</span></div>
      <form onSubmit={downloadBrief}>
        <fieldset><legend>What would you like to create?</legend><div className="brief-types">{Object.keys(PROJECT_TYPES).map((type) => <label key={type}><input type="radio" name="project-type" value={type} checked={projectType === type} onChange={() => setProjectType(type)} /><span>{type}</span></label>)}</div></fieldset>
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
        <label className="brief-label" htmlFor="project-notes">What do you have in mind? <span>Optional</span></label>
        <textarea id="project-notes" rows="3" maxLength={3000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="A place, a mood, the way you want to live…" />
        <div className="brief-selected"><span>Selected palette · Concept</span><strong>{material?.name ?? 'Original villa materials'}</strong></div>
        <button className="brief-download" type="submit">Download my brief <span aria-hidden="true">↓</span></button>
        <p className="brief-result" role="status">{prepared ? 'Your brief is ready. Check your downloads.' : 'Includes your selected materials and atmosphere.'}</p>
      </form>
    </section>
  );
}
