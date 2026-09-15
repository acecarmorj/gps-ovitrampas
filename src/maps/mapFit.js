/**
 * Enquadramento automático inteligente do Leaflet adaptado do MOTOJAGEMINI.
 * Permite que o mapa siga os pontos sem desfazer gestos de arrasto ou zoom do usuário no celular.
 */

export function fitPadding({ bottom = 40, top = 60, maxZoom = 17 } = {}) {
  return { paddingTopLeft: [24, top], paddingBottomRight: [24, bottom], maxZoom };
}

export function makeAutoFit(map) {
  const state = { userMoved: false, lastAutoAt: 0 };

  map.on("dragstart", () => {
    state.userMoved = true;
  });

  map.on("zoomstart", () => {
    if (Date.now() - state.lastAutoAt > 600) state.userMoved = true;
  });

  return {
    resume() {
      state.userMoved = false;
    },
    fit(bounds, opts) {
      if (state.userMoved || !bounds?.length) return;
      if (!map || !map._leaflet_id || !map.getContainer()) return;
      state.lastAutoAt = Date.now();
      try {
        if (bounds.length === 1) {
          map.setView(bounds[0], opts?.maxZoom ?? 16, { animate: opts?.animate !== false });
          return;
        }
        map.fitBounds(bounds, { ...fitPadding(opts), animate: opts?.animate !== false });
      } catch (err) {}
    }
  };
}
