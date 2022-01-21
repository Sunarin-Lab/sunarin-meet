import ReactDOM from 'react-dom';
import React from "react";
import SnackBar from './components/SnackBar';

const triggerSnackbar = (title, message, messageType, linkTo) => {
    console.log("link ", linkTo);
    const validMessageTypes = ['error', 'info', 'warning', 'success'];
    if (!validMessageTypes.includes(messageType)) {
        throw Error("Invalid snackbar message type");
    }
    ReactDOM.render(
            <SnackBar messageType={messageType} timer={5000} title={title} message={message} link={linkTo} />,
        document.getElementById('snackbar-fixed-container')
    );
};

export const showLinkMessage = (title, message, link) => {
    triggerSnackbar(title, message, 'info', link);
};

export const showErrorMessage = (title, message) => {
    triggerSnackbar(title, message, 'error');
};

export const showInfoMessage = (title, message) => {
    triggerSnackbar(title, message, 'info');
};

export const showSuccessMessage = (title, message) => {
    triggerSnackbar(title, message, 'success');
};

export const showWarningMessage = (title, message) => {
    triggerSnackbar(title, message, 'warning');
};
