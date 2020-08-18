<p align="center">
  <img src="https://github.com/obenjiro/vscode-arrr/blob/master/assets/github_logo.png?raw=true">
</p>

# ARRR - VSCode extension

ARRR - is a first extension that provides Rapid Refactoring geeRs for your Angular codebase.

## Highlights

- Allows extracting HTML into new component
- Automatic Modules Updates
- Generates HTML, CSS, TS and spec files

## Installation

Go to the link below and click `Install`.

[Visual Studio Code Market Place: arrr](https://marketplace.visualstudio.com/items?itemName=obenjiro.arrr)

## Features

### Extracting HTML into a new Component

arrr allows easy extraction of HTML into new Angular components. Just select the HTML to extract, and arrr will handle all the rest:

- It will identify all Inputs to the newly created component.
- Replace extracted HTML with newly created component, while providing it with all the Inputs.

![Example of HTML extraction](https://github.com/obenjiro/vscode-arrr/blob/master/assets/extract-to-dir.gif?raw=true)

## Contribute

Feel free to open issues or PRs!

### Getting started

In order to start working all you need to do is:

```sh
$ git clone git@github.com:obenjiro/vscode-arrr.git
$ cd vscode-arrr
$ npm install
$ code .
```

### Running Extension

- Go to VSCode debug sidebar
- Select `Extension` from the dropdown
- Hit `F5`

### Running Tests

- Go to VSCode debug sidebar
- Select `Extension Tests` from the dropdown
- Hit `F5`

### Commit messages

Please refer to to the following [guide](https://marketplace.visualstudio.com/items?itemName=obenjiro.arrr).

