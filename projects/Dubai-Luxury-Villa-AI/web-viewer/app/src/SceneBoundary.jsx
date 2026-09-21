import { Component } from 'react';

export default class SceneBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

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
