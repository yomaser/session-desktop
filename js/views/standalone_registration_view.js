/* global Whisper, $, getAccountManager, textsecure, i18n, passwordUtil, ConversationController */

/* eslint-disable more/no-then */

// eslint-disable-next-line func-names
(function() {
  'use strict';

  window.Whisper = window.Whisper || {};

  Whisper.StandaloneRegistrationView = Whisper.View.extend({
    templateName: 'standalone',
    className: 'full-screen-flow standalone-fullscreen',
    initialize() {
      this.accountManager = getAccountManager();

      this.render();

      const number = textsecure.storage.user.getNumber();
      if (number) {
        this.$('input.number').val(number);
      }
      this.phoneView = new Whisper.PhoneInputView({
        el: this.$('#phone-number-input'),
      });
      this.$('#error').hide();

      this.$('.standalone-mnemonic').hide();

      this.onGenerateMnemonic();

      const options = window.mnemonic.get_languages().map(language => {
        const text = language.charAt(0).toUpperCase() + language.slice(1);
        return `<option value="${language}">${text}</option>`;
      });
      this.$('#mnemonic-language').append(options);
      this.$('#mnemonic-display-language').append(options);

      this.$passwordInput = this.$('#password');
      this.$passwordConfirmationInput = this.$('#password-confirmation');
      this.$passwordConfirmationInput.hide();
      this.$passwordInputError = this.$('.password-inputs .error');

      this.onValidatePassword();
    },
    events: {
      'validation input.number': 'onValidation',
      'click #request-voice': 'requestVoice',
      'click #request-sms': 'requestSMSVerification',
      'change #code': 'onChangeCode',
      'click #register': 'registerWithoutMnemonic',
      'click #register-mnemonic': 'registerWithMnemonic',
      'change #mnemonic': 'onChangeMnemonic',
      'click #generate-mnemonic': 'onGenerateMnemonic',
      'change #mnemonic-display-language': 'onGenerateMnemonic',
      'click #copy-mnemonic': 'onCopyMnemonic',
      'click .section-toggle': 'toggleSection',
      'keyup #password': 'onPasswordChange',
      'keyup #password-confirmation': 'onValidatePassword',
    },
    async register(mnemonic) {
      // Make sure the password is valid
      if (this.validatePassword()) {
        this.showToast('Invalid password');
        return;
      }

      const input = this.trim(this.$passwordInput.val());

      try {
        await window.setPassword(input);
        await this.accountManager.registerSingleDevice(
          mnemonic,
          this.$('#mnemonic-language').val(),
          this.$('#display-name').val()
        );
        this.$el.trigger('openInbox');
      } catch (e) {
        if (typeof e === 'string') {
          this.showToast(e);
        }
        this.log(e);
      }
    },
    registerWithoutMnemonic() {
      const mnemonic = this.$('#mnemonic-display').text();
      this.register(mnemonic);
    },
    registerWithMnemonic() {
      const mnemonic = this.$('#mnemonic').val();
      if (!mnemonic) {
        this.log('Please provide a mnemonic word list');
      } else {
        this.register(mnemonic);
      }
    },
    onChangeMnemonic() {
      this.$('#status').html('');
    },
    async onGenerateMnemonic() {
      const language = this.$('#mnemonic-display-language').val();
      const mnemonic = await this.accountManager.generateMnemonic(language);
      this.$('#mnemonic-display').text(mnemonic)
    },
    onCopyMnemonic() {
      window.clipboard.writeText(this.$('#mnemonic-display').text());

      const toast = new Whisper.MessageToastView({
        message: i18n('copiedMnemonic'),
      });
      toast.$el.appendTo(this.$el);
      toast.render();
    },
    log(s) {
      window.log.info(s);
      this.$('#status').text(s);
    },
    displayError(error) {
      this.$('#error')
        .hide()
        .text(error)
        .addClass('in')
        .fadeIn();
    },
    onValidation() {
      if (this.$('#number-container').hasClass('valid')) {
        this.$('#request-sms, #request-voice').removeAttr('disabled');
      } else {
        this.$('#request-sms, #request-voice').prop('disabled', 'disabled');
      }
    },
    onChangeCode() {
      if (!this.validateCode()) {
        this.$('#code').addClass('invalid');
      } else {
        this.$('#code').removeClass('invalid');
      }
    },
    requestVoice() {
      window.removeSetupMenuItems();
      this.$('#error').hide();
      const number = this.phoneView.validateNumber();
      if (number) {
        this.accountManager
          .requestVoiceVerification(number)
          .catch(this.displayError.bind(this));
        this.$('#step2')
          .addClass('in')
          .fadeIn();
      } else {
        this.$('#number-container').addClass('invalid');
      }
    },
    requestSMSVerification() {
      window.removeSetupMenuItems();
      $('#error').hide();
      const number = this.phoneView.validateNumber();
      if (number) {
        this.accountManager
          .requestSMSVerification(number)
          .catch(this.displayError.bind(this));
        this.$('#step2')
          .addClass('in')
          .fadeIn();
      } else {
        this.$('#number-container').addClass('invalid');
      }
    },
    toggleSection(e) {
      // Expand or collapse this panel
      const $target = this.$(e.target);
      const $next = $target.next();

      // Toggle section visibility
      $next.slideToggle('fast');
      $target.toggleClass('section-toggle-visible');

      // Hide the other sections
      this.$('.section-toggle').not($target).removeClass('section-toggle-visible')
      this.$('.section-content').not($next).slideUp('fast');
    },
    onPasswordChange() {
      const input = this.$passwordInput.val();
      if (!input || input.length === 0) {
        this.$passwordConfirmationInput.val('');
        this.$passwordConfirmationInput.hide();
      } else {
        this.$passwordConfirmationInput.show();
      }
      this.onValidatePassword();
    },
    validatePassword() {
      const input = this.trim(this.$passwordInput.val());
      const confirmationInput = this.trim(this.$passwordConfirmationInput.val());

      const error = passwordUtil.validatePassword(input);
      if (error)
        return error;

      if (input !== confirmationInput)
        return 'Password don\'t match';

      return null;
    },
    onValidatePassword() {
      const passwordValidation = this.validatePassword();
      if (passwordValidation) {
        this.$passwordInput.addClass('error-input');
        this.$passwordConfirmationInput.addClass('error-input');
        this.$passwordInputError.text(passwordValidation);
        this.$passwordInputError.show();
      } else {
        this.$passwordInput.removeClass('error-input');
        this.$passwordConfirmationInput.removeClass('error-input');
        this.$passwordInputError.text('');
        this.$passwordInputError.hide();
      }
    },
    trim(value) {
      return value ? value.trim() : value;
    },
    showToast(message) {
      const toast = new Whisper.MessageToastView({
        message,
      });
      toast.$el.appendTo(this.$el);
      toast.render();
    },
  });
})();
