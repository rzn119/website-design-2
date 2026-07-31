(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;

  var confirmation = document.querySelector('.contact-form__confirmation');
  var status = form.querySelector('.contact-form__status');
  var submitBtn = form.querySelector('.contact-form__submit');
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function isZh() {
    return document.documentElement.lang === 'zh-Hans';
  }

  function fieldEl(name) {
    return form.querySelector('[name="' + name + '"]');
  }

  function setInvalid(name, invalid) {
    fieldEl(name).closest('.contact-form__field').classList.toggle('is-invalid', invalid);
  }

  function validate() {
    var name = fieldEl('name').value.trim();
    var email = fieldEl('email').value.trim();
    var message = fieldEl('message').value.trim();
    var emailOk = !!email && EMAIL_RE.test(email);

    setInvalid('name', !name);
    setInvalid('email', !emailOk);
    setInvalid('message', !message);

    return !!name && emailOk && !!message;
  }

  ['name', 'email', 'message'].forEach(function (name) {
    fieldEl(name).addEventListener('input', function () {
      setInvalid(name, false);
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.hidden = true;

    if (!validate()) {
      var firstInvalid = form.querySelector('.contact-form__field.is-invalid input, .contact-form__field.is-invalid textarea');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    submitBtn.disabled = true;

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
    }).then(function (res) {
      if (res.ok) {
        form.hidden = true;
        confirmation.hidden = false;
      } else {
        submitBtn.disabled = false;
        status.textContent = isZh()
          ? '发送时出现问题,请稍后再试。'
          : 'Something went wrong — please try again in a moment.';
        status.hidden = false;
      }
    }).catch(function () {
      submitBtn.disabled = false;
      status.textContent = isZh()
        ? '发送时出现问题,请稍后再试。'
        : 'Something went wrong — please try again in a moment.';
      status.hidden = false;
    });
  });
})();
