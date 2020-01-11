'use babel'
/** @jsx etch.dom */

import etch from 'etch'
import { Emitter, CompositeDisposable } from 'atom'
import fs from 'fs'
import path from 'path'
import IconService from './icon-service'

function getRepo(path) {
	const [rootDir] = atom.project.relativizePath(path)
	const rootDirIndex = atom.project.getPaths().indexOf(rootDir)

	if (rootDirIndex >= 0) {
		return atom.project.getRepositories()[rootDirIndex]
	}

	for (const repo of atom.project.getRepositories()) {
		if (repo) {
			return repo
		}
	}
}

export default class AcetateView {
	static get views() {
		if (!this._views) this._views = new Map()
		return this._views
	}

	static openParent() {
		const item = atom.workspace.getActivePaneItem()
		if (!item.getPath) {
			return
		}

		this.openFolder({
			path: path.dirname(item.getPath()),
			selectItem: path.basename(item.getPath()),
		})
	}

	static openFolder({ path, selectItem }) {
		const pane = atom.workspace.getActivePane()
		const id = `${pane.id}-${path}`

		const view = this.views.has(id)
			? this.views.get(id)
			: new AcetateView({ path, selectItem })

		this.views.set(id, view)
		view.onDestroyed(() => this.views.delete(id))

		pane.activateItem(view)
	}

	constructor({ path, selectItem, selectedIndex }) {
		this.emitter = new Emitter()
		this.updatePath(path)
		this.selectedIndex =
			selectedIndex || (selectItem ? this.items.indexOf(selectItem) : 0)

		this.subscription = new CompositeDisposable(
			IconService.onDidSetIconService(() => {
				etch.update(this)
			}),
			atom.project.onDidChangeFiles(() => {
				this.updatePath(this.path)
				etch.update(this)
			}),
		)

		etch.initialize(this)
		setTimeout(() => {
			this.updateScrollPosition()
		}, 100)
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
		const openFile = file => {
			const fullPath = path.join(this.path, file)
			const isDir = fs.statSync(fullPath).isDirectory()
			if (isDir) {
				AcetateView.openFolder({ path: fullPath })
			} else {
				atom.workspace.open(fullPath)
			}
		}

		return (
			<div
				class='acetate'
				tabIndex={-1}
				ref='container'
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
								this.items.length - 1,
								this.selectedIndex + 1,
							)
							etch.update(this)
							break
						case 'ArrowRight':
						case 'Enter':
							openFile(this.items[this.selectedIndex])
							break
					}
					this.updateScrollPosition()
				}}
			>
				<ul class='list-group'>
					{this.items.map((file, index) => {
						const fullPath = path.join(this.path, file)
						const iconClass = IconService.iconClassForPath(fullPath).join(' ')
						const repo = getRepo(fullPath)
						const ignored = repo.isPathIgnored(fullPath)
						const status = repo.getPathStatus(fullPath)

						const statusClass = ignored
							? 'status-ignored icon-diff-ignored'
							: status === 256
							? 'status-modified icon-diff-modified'
							: status === 128
							? 'status-added icon-diff-added'
							: status === 1
							? 'status-renamed icon-diff-renamed'
							: null

						return (
							<li
								class={`list-item ${
									index === this.selectedIndex ? 'selected' : ''
								} ${ignored ? 'acetate-ignored' : ''}`}
								key={file}
							>
								<button
									class='acetate-file'
									type='button'
									onClick={() => {
										openFile(file)
									}}
								>
									<span class={`icon ${iconClass}`} />
									{file}

									{statusClass ? (
										<span class={`pull-right icon ${statusClass}`} />
									) : null}
								</button>
							</li>
						)
					})}
				</ul>
			</div>
		)
	}

	updateScrollPosition() {
		const currentItem = this.refs.container.querySelectorAll('.list-item')[
			this.selectedIndex
		]

		currentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
	}

	update(newProps) {
		if (newProps.path !== this.path) {
			this.updatePath(newProps.path)
			etch.update(this)
		}
	}

	updatePath(path) {
		this.path = path
		if (this.path && fs.existsSync(this.path)) {
			this.items = fs.readdirSync(this.path)
			this.emitter.emit('changed-path')
		} else {
			atom.workspace.paneForItem(this).removeItem(this)
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
		return {
			deserializer: 'AcetateView',
			path: this.path,
			selectedIndex: this.selectedIndex,
		}
	}

	async destroy() {
		await etch.destroy(this)
		this.emitter.emit('destroyed')
		this.subscription.dispose()
	}
}
