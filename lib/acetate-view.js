'use babel'
/** @jsx etch.dom */

import etch from 'etch'
import { Emitter } from 'atom'
import fs from 'fs'
import path from 'path'

export default class AcetateView {
	static get views() {
		if (!this._views) this._views = new Set()
		return this._views
	}

	static openFolder(path) {
		const view = new AcetateView({ path })

		this.views.add(view)
		view.onDestroyed(() => this.views.delete(view))

		const pane = atom.workspace.getActivePane()
		pane.activateItem(view)
	}

	constructor({ path }) {
		this.path = path
		this.emitter = new Emitter()
		etch.initialize(this)
	}

	onDestroyed(callback) {
		return this.emitter.on('destroyed', callback)
	}

	onDidChangePath(callback) {
		return this.emitter.on('changed-path', callback)
	}

	onDidChangeModified(callback) {
		return this.emitter.on('changed-modified', callback)
	}

	onDidChangeGrammar(callback) {
		return this.emitter.on('changed-grammar', callback)
	}

	onDidSave(callback) {
		return this.emitter.on('save', callback)
	}

	render() {
		return (
			<div class='acetate' tabIndex={-1}>
				<ul class='list-group'>
					{fs.readdirSync(this.path).map(file => {
						const fullPath = path.join(this.path, file)
						const isDir = fs.statSync(fullPath).isDirectory()
						return (
							<li class='list-item' key={file}>
								<button
									class='acetate-file'
									type='button'
									onClick={() => {
										if (isDir) {
											AcetateView.openFolder(fullPath)
										} else {
											atom.workspace.open(fullPath)
										}
									}}
								>
									<i class={`icon icon-file-${isDir ? 'directory' : 'text'}`} />
									{file}
								</button>
							</li>
						)
					})}
				</ul>
			</div>
		)
	}

	update(newProps) {
		if (newProps.path !== this.path) {
			this.path = newProps.path
			etch.update(this)
			this.emitter.emit('changed-path')
		}
	}

	getPath() {
		return this.path
	}

	getTitle() {
		return this.path
	}

	getGrammar() {
		return { name: 'Folder' }
	}

	isModified() {
		return false
	}

	serialize() {
		return { deserializer: 'AcetateView', path: this.path }
	}

	async destroy() {
		await etch.destroy(this)
		this.emitter.emit('destroyed')
	}
}
