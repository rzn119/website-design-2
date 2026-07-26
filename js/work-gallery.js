(function () {
  var galleryEls = Array.prototype.slice.call(document.querySelectorAll('[data-gallery]'));
  var lightbox = document.getElementById('lightbox');
  if (!galleryEls.length || !lightbox) return;

  var lightboxStage = lightbox.querySelector('.lightbox__stage');
  var lightboxSlides = lightbox.querySelector('.lightbox__slides');
  var lightboxCounter = lightbox.querySelector('.lightbox__counter');
  var lightboxClose = lightbox.querySelector('.lightbox__close');
  var lightboxPrev = lightbox.querySelector('.lightbox__prev');
  var lightboxNext = lightbox.querySelector('.lightbox__next');

  var activeGallery = null; // the gallery object currently open in the lightbox
  var savedScrollY = 0;
  var SWIPE_THRESHOLD = 40;

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  // Each gallery keeps its own index — nothing here is shared state
  // between projects, so cycling one never touches another's.
  function createGallery(el) {
    var slides = Array.prototype.slice.call(el.querySelectorAll('.project__gallery-slide'));
    var counterEl = el.querySelector('.project__gallery-counter');
    var nextBtn = el.querySelector('.project__gallery-next');
    var index = 0;

    function render() {
      slides.forEach(function (slide, i) {
        slide.classList.toggle('is-active', i === index);
      });
      if (counterEl) counterEl.textContent = pad(index + 1) + ' / ' + pad(slides.length);
      if (activeGallery === gallery) renderLightbox();
    }

    function goTo(i) {
      index = ((i % slides.length) + slides.length) % slides.length;
      render();
    }

    function next() {
      goTo(index + 1);
    }

    function prev() {
      goTo(index - 1);
    }

    var gallery = {
      el: el,
      slides: slides,
      count: slides.length,
      next: next,
      prev: prev,
      goTo: goTo,
      getIndex: function () { return index; },
    };

    if (nextBtn) {
      nextBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        next();
      });
    }

    el.addEventListener('click', function () {
      openLightbox(gallery);
    });

    attachSwipe(el, next, prev);

    render();
    return gallery;
  }

  function attachSwipe(el, onNext, onPrev) {
    var startX = null;
    var startY = null;

    el.addEventListener('touchstart', function (e) {
      var t = e.changedTouches[0];
      startX = t.clientX;
      startY = t.clientY;
    }, { passive: true });

    el.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var t = e.changedTouches[0];
      var dx = t.clientX - startX;
      var dy = t.clientY - startY;
      startX = null;
      startY = null;
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) onNext(); else onPrev();
    }, { passive: true });
  }

  function renderLightbox() {
    if (!activeGallery) return;
    lightboxSlides.innerHTML = '';
    var index = activeGallery.getIndex();
    activeGallery.slides.forEach(function (slide, i) {
      var clone = slide.cloneNode(true);
      clone.className = 'lightbox__slide';
      clone.classList.toggle('is-active', i === index);
      lightboxSlides.appendChild(clone);
    });
    lightboxCounter.textContent = pad(index + 1) + ' / ' + pad(activeGallery.count);
  }

  function openLightbox(gallery) {
    activeGallery = gallery;
    savedScrollY = window.scrollY;
    renderLightbox();
    document.body.classList.add('lightbox-open');
    document.body.style.top = -savedScrollY + 'px';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', onKeydown);
    lightboxClose.focus();
  }

  function closeLightbox() {
    if (!activeGallery) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    document.body.style.top = '';
    window.scrollTo(0, savedScrollY);
    document.removeEventListener('keydown', onKeydown);
    activeGallery = null;
  }

  function onKeydown(e) {
    if (!activeGallery) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowRight') activeGallery.next();
    else if (e.key === 'ArrowLeft') activeGallery.prev();
  }

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxNext.addEventListener('click', function () { if (activeGallery) activeGallery.next(); });
  lightboxPrev.addEventListener('click', function () { if (activeGallery) activeGallery.prev(); });

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  attachSwipe(lightboxStage, function () { if (activeGallery) activeGallery.next(); }, function () { if (activeGallery) activeGallery.prev(); });

  galleryEls.forEach(createGallery);
})();
