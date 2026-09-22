import { Component } from 'react';

export default class SceneBoundary extends Component {
  state = { failed: false };

  /** Switch to the static scene fallback when a descendant throws during rendering. */
  static getDerivedStateFromError() {
    return { failed: true };
  }

  /** Show the viewer children or a source image with retry and gallery navigation after a failure. */
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="scene-unavailable">
        <img src={`${import.meta.env.BASE_URL}editorial/residence-1600.webp`} alt="The residence beside its reflecting pool" width="1600" height="900" />
        <div>
          <h3>The 3D view couldn't open.</h3>
          <p>You can still explore the architectural images and material palettes.</p>
          <button type="button" onClick={() => this.setState({ failed: false })}>Try the 3D view again</button>
          <a href="#spaces">Explore the images ↗</a>
        </div>
      </div>
    );
  }
}
