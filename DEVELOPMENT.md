# UI Seed Development

Besides the UI system per se, this repo also contains a little sandbox that can be used to test elements.  

The following instructions are divided in two sections:
- UI system development
- Sandbox

The main purpose of this system is to modularize the assets, therefore is important to maintain a clear separation between the design-system and the sandbox. The sandbox depends on the design-system but not the other way around.

## Development environment
To set up the development environment for this website, you'll need to install the following on your system:

- [Node](http://nodejs.org/) v6 (To manage multiple node versions we recommend [nvm](https://github.com/creationix/nvm))
- [Yarn](https://yarnpkg.com/) Package manager

After these basic requirements are met, run the following commands in the website's folder:
```
$ yarn install
```

### UI system development
All assets that belong to the design system go in the root's `assets` folder and are separated by type:
```
assets/
  graphics/
    layout/
    meta/
  icons/
  styles/
    ui-seed/
  scripts/
```
These assets will then be available to be used after installing the module.

**assets/styles**  
All the individual style files (like _buttons.scss, _forms.scss, ...) must go inside the `ui-seed` folder and then be included in the main file (`_ui-seed.scss`)

**assets/scripts**  
The scripts files should all be modules and linked in `index.js`.  
These files can then be liked in the doc's files and used.

**assets/icons**  
Svg icons to be compiled into a webfont. The resulting compiled file must be committed with the rest of the styles.  
To manually compile the `ui-seed` icons run:
```
$ yarn run ui-seed-icons
```

### Sandbox
The sandbox site resides in `sandbox/`.

```
$ yarn run serve
```
Compiles the sass files, javascript, and launches the server making the site available at `http://localhost:3000/`  
The system will watch files and execute tasks whenever one of them changes.  
The site will automatically refresh since it is bundled with livereload.


The `ui-seed` styles are included with:
```scss
@import "ui-seed";
```

And the scripts modules are collectively included through:
```js
import { componentName } from '../../../assets/scripts';
// The will be the equivalent of doing:
// import { componentName } from 'ui-seed'
```

or individually:
```js
import componentName from '../../../assets/scripts/componentName';
```

**Important:** If you need to install new node modules, install them as **dependencies** if they are for the `ui-seed` and as **devDependencies** if they're for the sandbox.

## Deployment
The .travis.yml file enables the usage of [Travis](http://travis.org) as a test and deployment system.  
In this particular case, Travis will only publish new versions to the npm registry.

## Linting
Code follows the `semistandard` code style and should be linted.
- `yarn run lint` - will run linter and warn of any errors.
