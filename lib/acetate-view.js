'use babel'
/** @jsx etch.dom */

import etch from 'etch'
import { Emitter } from 'atom'

export default class AcetateView {
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
		return <div>{this.path}</div>
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
