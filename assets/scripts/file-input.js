'use strict';
import React, { PropTypes as T } from 'react';

class FileInput extends React.PureComponent {
  constructor (props) {
    super(props);

    this.state = {
      focused: false
    };
  }

  onFileSelect (event) {
    this.props.onFileSelect(event.target.files[0]);
  }

  render () {
    let fieldVal = this.props.value ? this.props.value.name : this.props.placeholder;
    let labelKlass = 'form__label';
    let fieldKlass = 'form__file';

    if (this.props.hideLabel) {
      labelKlass += ' visually-hidden';
    }

    if (this.state.focused) {
      fieldKlass += ' form__control--focus';
    }

    return (
      <div className={this.props.wrapperClass}>
        {this.props.label ? <label className={labelKlass} htmlFor={this.props.id}>{this.props.label}</label> : null}
        <div className={fieldKlass} onClick={() => { this.refs.file.click(); }}>
          <span className='form__file__text'>{fieldVal}</span>
          <input
            type='file'
            id={this.props.id}
            name={this.props.name}
            placeholder={fieldVal}
            ref='file'
            onFocus={() => this.setState({focused: true})}
            onBlur={() => this.setState({focused: false})}
            onChange={this.onFileSelect.bind(this)}
          />
        </div>
        {this.props.children}
      </div>
    );
  }
}

FileInput.propTypes = {
  wrapperClass: T.string,
  id: T.string,
  name: T.string,
  label: T.string,
  hideLabel: T.bool,
  value: T.oneOfType([T.string, T.object]),
  placeholder: T.string,
  onFileSelect: T.func,
  children: T.object
};

FileInput.defaultProps = {
  hideLabel: false,
  wrapperClass: 'form__group'
};

export default FileInput;
