(() => {
  'use strict';
  /* Marker-only module. The continuous Test Map implementation is injected into the traversal
     module's lexical scope by run-ui-bridge-v21 so navigation and combat can share the exact same
     camera, terrain renderer and object references. Keeping this tiny file gives the verifier and
     future map authoring work a stable architecture/version marker without creating a second world. */
  window.__TTD_CONTINUOUS_WORLD_V1 = Object.freeze({
    version: 1,
    contract: 'one-world-one-camera-persistent-objects',
  });
})();
