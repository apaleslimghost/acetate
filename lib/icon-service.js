'use babel'

import fs from 'fs'
import { Emitter } from 'atom'

export default {
	emitter: new Emitter(),

	service: {
		iconClassForPath(path) {
			if (fs.statSync(path).isDirectory()) {
				return ['icon', 'icon-file-folder']
			}

			return ['icon', 'icon-file-folder']
		},
	},

	setIconService(service) {
		this.service = service
		this.emitter.emit('set-icon-service')
	},

	iconClassForPath(path) {
		return this.service.iconClassForPath(path)
	},

	onDidSetIconService(callback) {
		return this.emitter.on('set-icon-service', callback)
	},
}
