import { useEffect, useState } from 'react';

export default function ProjectBrief({ material, lighting }) {
  const [projectType, setProjectType] = useState('Villa architecture');
  const [notes, setNotes] = useState('');
  const [prepared, setPrepared] = useState(false);
  useEffect(() => setPrepared(false), [material?.id, lighting]);
  function downloadBrief(event) {
    event.preventDefault();
    const content = [
      'ARCHITECTURAL AI LAB / PROJECT BRIEF', '',
      `Project: ${projectType}`,
      `Reference: Dubai residence — Desert, distilled.`,
      `Material direction: ${material?.name ?? 'Original villa materials'}`,
      `Preferred atmosphere: ${lighting}`, '',
      'Your ideas:', notes.trim() || 'To be discussed.', '',
      'Next details to define:',
      'Location and site / room dimensions',
      'Required spaces and household needs',
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
      <div><p className="eyebrow">04 / Your next space</p><h2 id="brief-title">Every home starts<br />with <em>a feeling.</em></h2><p>A villa, a kitchen, a room to call your own. Capture a direction for your project, starting with what speaks to you here.</p><span className="brief-note">Your brief downloads to your device. Nothing is submitted.</span></div>
      <form onSubmit={downloadBrief}>
        <fieldset><legend>What would you like to create?</legend><div className="brief-types">{['Villa architecture', 'Kitchen design', 'Home interiors'].map((type) => <label key={type}><input type="radio" name="project-type" value={type} checked={projectType === type} onChange={() => { setProjectType(type); setPrepared(false); }} /><span>{type}</span></label>)}</div></fieldset>
        <label className="brief-label" htmlFor="project-notes">What do you have in mind? <span>Optional</span></label>
        <textarea id="project-notes" rows="3" maxLength={3000} value={notes} onChange={(event) => { setNotes(event.target.value); setPrepared(false); }} placeholder="A place, a mood, the way you want to live…" />
        <div className="brief-selected"><span>Selected palette</span><strong>{material?.name ?? 'Original villa materials'}</strong></div>
        <button className="brief-download" type="submit">Download my brief <span aria-hidden="true">↓</span></button>
        <p className="brief-result" role="status">{prepared ? 'Your brief is ready. Check your downloads.' : 'Includes your selected materials and atmosphere.'}</p>
      </form>
    </section>
  );
}
