import React from 'react';
import classNames from 'classnames';
import moment from 'moment';

import { Message } from './Message';
import { useDispatch, useSelector } from 'react-redux';
import { Avatar, AvatarSize } from '../../../avatar/Avatar';
import { deleteMessagesById } from '../../../../interactions/conversations/unsendingInteractions';
import {
  closeMessageDetailsView,
  ContactPropsMessageDetail,
} from '../../../../state/ducks/conversations';
import { getMessageDetailsViewProps } from '../../../../state/selectors/conversations';
import { ContactName } from '../../ContactName';
// tslint:disable-next-line: no-submodule-imports
import useKey from 'react-use/lib/useKey';
import { SessionButton, SessionButtonColor, SessionButtonType } from '../../../basic/SessionButton';
import { useMessageIsDeletable } from '../../../../state/selectors';

const AvatarItem = (props: { pubkey: string }) => {
  const { pubkey } = props;

  return <Avatar size={AvatarSize.S} pubkey={pubkey} />;
};

const DeleteButtonItem = (props: { messageId: string; convoId: string; isDeletable: boolean }) => {
  const { i18n } = window;

  return props.isDeletable ? (
    <div className="module-message-detail__delete-button-container">
      <SessionButton
        text={i18n('delete')}
        buttonColor={SessionButtonColor.Danger}
        buttonType={SessionButtonType.Solid}
        onClick={async () => {
          await deleteMessagesById([props.messageId], props.convoId);
        }}
      />
    </div>
  ) : null;
};

const ContactsItem = (props: { contacts: Array<ContactPropsMessageDetail> }) => {
  const { contacts } = props;

  if (!contacts || !contacts.length) {
    return null;
  }

  return (
    <div className="module-message-detail__contact-container">
      {contacts.map(contact => (
        <ContactItem key={contact.pubkey} contact={contact} />
      ))}
    </div>
  );
};

const ContactItem = (props: { contact: ContactPropsMessageDetail }) => {
  const { contact } = props;
  const errors = contact.errors || [];

  const statusComponent = (
    <div
      className={classNames(
        'module-message-detail__contact__status-icon',
        `module-message-detail__contact__status-icon--${contact.status}`
      )}
    />
  );

  return (
    <div key={contact.pubkey} className="module-message-detail__contact">
      <AvatarItem pubkey={contact.pubkey} />
      <div className="module-message-detail__contact__text">
        <div className="module-message-detail__contact__name">
          <ContactName
            pubkey={contact.pubkey}
            name={contact.name}
            profileName={contact.profileName}
            shouldShowPubkey={true}
          />
        </div>
        {errors.map((error, index) => (
          <div key={index} className="module-message-detail__contact__error">
            {error.message}
          </div>
        ))}
      </div>
      {statusComponent}
    </div>
  );
};

export const MessageDetail = () => {
  const { i18n } = window;

  const messageDetailProps = useSelector(getMessageDetailsViewProps);
  const isDeletable = useMessageIsDeletable(messageDetailProps?.messageId);

  const dispatch = useDispatch();

  useKey('Escape', () => {
    dispatch(closeMessageDetailsView());
  });

  if (!messageDetailProps) {
    return null;
  }

  const { errors, receivedAt, sentAt, convoId, direction, messageId } = messageDetailProps;

  return (
    <div className="message-detail-wrapper">
      <div className="module-message-detail">
        <div className="module-message-detail__message-container">
          <Message messageId={messageId} isDetailView={true} />
        </div>
        <table className="module-message-detail__info">
          <tbody>
            {(errors || []).map((error, index) => (
              <tr key={index}>
                <td className="module-message-detail__label">{i18n('error')}</td>
                <td>
                  {' '}
                  <span className="error-message text-selectable">{error.message}</span>{' '}
                </td>
              </tr>
            ))}
            <tr>
              <td className="module-message-detail__label">{i18n('sent')}</td>
              <td>
                {moment(sentAt).format('LLLL')} <span>({sentAt})</span>
              </td>
            </tr>
            {receivedAt ? (
              <tr>
                <td className="module-message-detail__label">{i18n('received')}</td>
                <td>
                  {moment(receivedAt).format('LLLL')} <span>({receivedAt})</span>
                </td>
              </tr>
            ) : null}
            <tr>
              <td className="module-message-detail__label">
                {direction === 'incoming' ? i18n('from') : i18n('to')}
              </td>
            </tr>
          </tbody>
        </table>
        <ContactsItem contacts={messageDetailProps.contacts} />
        <DeleteButtonItem convoId={convoId} messageId={messageId} isDeletable={isDeletable} />
      </div>
    </div>
  );
};
