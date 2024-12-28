const PREFIX = 'tp';

export function ClassName(viewName) {
	const fn = (opt_elementName, opt_modifier) => {
		return [PREFIX, '-', viewName, 'v', opt_elementName ? `_${opt_elementName}` : '', opt_modifier ? `-${opt_modifier}` : '' ].join('');
	};
	return fn;
}

const className = ClassName('txtr');

function parseRecord(value, keyToParserMap) {
  return value;
}

class TextAreaView {
	constructor(doc, config) {
		this.onChange_ = this.onChange_.bind(this);

		this.element = doc.createElement('div');
		this.element.classList.add(className());
		config.viewProps.bindClassModifiers(this.element);

		const inputElem = doc.createElement('textarea');
		inputElem.rows = config.rows;
		inputElem.cols = 22;
		inputElem.placeholder = config.placeholder;
		inputElem.classList.add(className('i'));

		config.viewProps.bindDisabled(inputElem);
		this.element.appendChild(inputElem);
		this.inputElement = inputElem;

		config.value.emitter.on('change', this.onChange_);
		this.value_ = config.value;

		this.refresh();
	}

	refresh() {
		this.inputElement.value = this.value_.rawValue;
	}

	onChange_() {
		this.refresh();
	}
}

class TextAreaController {
	constructor(doc, config) {
		this.onInputChange_ = this.onInputChange_.bind(this);
		this.value = config.value;
		this.viewProps = config.viewProps;
		this.rows = config.rows;
		this.placeholder = config.placeholder;

		this.view = new TextAreaView(doc, {
			value: this.value,
			viewProps: this.viewProps,
			rows: this.rows,
			placeholder: this.placeholder,
		});
		this.view.inputElement.addEventListener('keydown', this.onKeyDown_);
		this.view.inputElement.addEventListener('keyup', this.onInputChange_);
	}

  onKeyDown_(e) {
		if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
    }
  }

	onInputChange_(e) {
		if (e.key === 'Enter' && e.shiftKey) {
      const inputElem = e.currentTarget;
      const value = inputElem.value;
      this.value.rawValue = value;
      this.view.refresh();
		}
	}
}

export const TextareaPlugin = {
  core: {
    major: 2,
    minor: 0,
    patch: 3,
    prerelease: null,
  },
  id: 'input-template',
  type: 'input',

	accept(exValue, params) {
		if (typeof exValue !== 'string') {
			return null;
		}

		const result = parseRecord(params, (p) => ({
			view: p.required.constant('textarea'),
			rows: p.optional.number,
			placeholder: p.optional.string,
		}));
		if (!result) {
			return null;
		}

		return {
			initialValue: exValue,
			params: result,
		};
	},

	binding: {
		reader(_args) {
			return (exValue) => {
				return typeof exValue === 'string' ? exValue : '';
			};
		},

		writer(_args) {
			return (target, inValue) => {
				target.write(inValue);
			};
		},
	},

	controller(args) {
		return new TextAreaController(args.document, {
			value: args.value,
			rows: args.params.rows ?? 3,
			placeholder: args.params.placeholder ?? 'Enter text here',
			viewProps: args.viewProps,
		});
	},
};
