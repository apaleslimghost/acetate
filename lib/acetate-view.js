'use babel'
/** @jsx etch.dom */

import etch from 'etch'
import { Emitter } from 'atom'
import fs from 'fs'
import path from 'path'

export default class AcetateView {
	static get views() {
		if (!this._views) this._views = new Map()
		return this._views
	}

	static openFolder(path) {
		const view = this.views.has(path)
			? this.views.get(path)
			: new AcetateView({ path })

		this.views.set(path, view)
		view.onDestroyed(() => this.views.delete(path))

		const pane = atom.workspace.getActivePane()
		pane.activateItem(view)
	}

	constructor({ path }) {
		this.path = path
		this.selectedIndex = 0
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
		const items = fs.readdirSync(this.path)
		const openFile = file => {
			const fullPath = path.join(this.path, file)
			const isDir = fs.statSync(fullPath).isDirectory()
			if (isDir) {
				AcetateView.openFolder(fullPath)
			} else {
				atom.workspace.open(fullPath)
			}
		}

		return (
			<div
				class='acetate'
				tabIndex={-1}
				onKeyDown={event => {
					switch (event.key) {
						case 'ArrowUp':
						case 'k':
							this.selectedIndex = Math.max(0, this.selectedIndex - 1)
							etch.update(this)
							break
						case 'ArrowDown':
						case 'j':
							this.selectedIndex = Math.min(
								items.length - 1,
								this.selectedIndex + 1,
							)
							etch.update(this)
							break
						case 'Enter':
							openFile(items[this.selectedIndex])
					}
				}}
			>
				<ul class='list-group'>
					{items.map((file, index) => {
						const fullPath = path.join(this.path, file)
						const isDir = fs.statSync(fullPath).isDirectory()
						return (
							<li
								class={`list-item ${
									index === this.selectedIndex ? 'selected' : ''
								}`}
								key={file}
							>
								<button
									class='acetate-file'
									type='button'
									onClick={() => {
										openFile(file)
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
