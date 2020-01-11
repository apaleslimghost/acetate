'use babel'
/** @jsx etch.dom */

import etch from 'etch'
import { Emitter, CompositeDisposable } from 'atom'
import { shell } from 'electron'
import fs from 'fs'
import path from 'path'
import IconService from './icon-service'
import mkdirp from 'mkdirp'

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
					const file = this.items[this.selectedIndex]
					const fullPath = path.join(this.path, file)

					switch (event.key) {
						case 'ArrowUp':
						case 'k':
							if (this.renamingIndex) break
							this.selectedIndex = Math.max(0, this.selectedIndex - 1)
							etch.update(this)
							break

						case 'ArrowDown':
						case 'j':
							if (this.renamingIndex) break
							this.selectedIndex = Math.min(
								this.items.length - 1,
								this.selectedIndex + 1,
							)
							etch.update(this)
							break

						case 'Enter':
							if (this.renamingIndex) {
								const newName = this.refs.renaming.value
								if (!newName) return

								const newPath = path.resolve(fullPath, '../', newName)
								const newDir = path.dirname(newPath)
								mkdirp.sync(newDir)

								fs.renameSync(fullPath, newPath)
								this.renamingIndex = null
								etch.update(this)

								AcetateView.openFolder({
									path: path.dirname(newPath),
									selectItem: path.basename(newPath),
								})
							} else if (this.creatingFile) {
								const newName = this.refs.creating.value
								if (!newName) return

								const newPath = path.resolve(this.path, newName)
								this.creatingFile = null
								etch.update(this)

								atom.workspace.open(newPath)
							} else {
								openFile(file)
							}
							break

						case 'Escape':
							this.renamingIndex = null
							this.creatingFile = null
							etch.update(this)
							break

						case 'd': {
							if (this.renamingIndex) break
							atom.confirm(
								{
									message: `Are you sure you want to delete ${atom.project.relativize(
										fullPath,
									)}?`,
									buttons: ['Move to Trash', 'Cancel'],
								},
								response => {
									if (response === 0) {
										shell.moveItemToTrash(fullPath)
									}
								},
							)
							break
						}

						case 'r':
							if (!this.creatingFile && !this.renamingIndex) {
								this.renamingIndex = this.selectedIndex
								etch.update(this)
							}
							break

						case 'n':
							if (!this.creatingFile && !this.renamingIndex) {
								this.creatingFile = true
								etch.update(this)
							}
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
								{this.renamingIndex === index ? (
									<input
										ref={el => {
											if (el) requestAnimationFrame(() => el.focus())
											this.refs.renaming = el
										}}
										class='input-text native-key-bindings'
										placeholder={file}
										onBlur={() => {
											this.renamingIndex = null
											requestAnimationFrame(() => etch.update(this))
										}}
									/>
								) : (
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
								)}
							</li>
						)
					})}
					{this.creatingFile ? (
						<li class='list-item selected'>
							<input
								ref={el => {
									if (el) requestAnimationFrame(() => el.focus())
									this.refs.creating = el
								}}
								class='input-text native-key-bindings'
								onBlur={() => {
									this.creatingFile = null
									requestAnimationFrame(() => etch.update(this))
								}}
							/>
						</li>
					) : null}
				</ul>
			</div>
		)
	}

	updateScrollPosition() {
		const currentItem = this.refs.container.querySelectorAll('.list-item')[
			this.selectedIndex
		]

		if (currentItem) {
			currentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
		}
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
		if (atom.project.getPaths().includes(this.path)) {
			return { name: 'Project' }
		}

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
