import React from "react";
import ReactDOM from "react-dom";
import App from './App';
import './index.css';
import exportedStyles from '!!css-loader!./index.css';

ReactDOM.render(
    <App />,
    document.getElementById('app')
);