'use babel'

import AcetateView from './acetate-view'
import { CompositeDisposable } from 'atom'
import path from 'path'
import IconService from './icon-service'

export default {
	subscriptions: null,

	activate() {
		this.subscriptions = new CompositeDisposable()

		this.subscriptions.add(
			atom.commands.add('atom-workspace', {
				'acetate:open-folder': () => this.openParent(),
			}),
		)
	},

	deactivate() {
		this.subscriptions.dispose()
		AcetateView.views.forEach(view => view.destroy())
	},

	openParent() {
		const item = atom.workspace.getActivePaneItem()
		if (!item.getPath) {
			return
		}

		AcetateView.openFolder(path.dirname(item.getPath()))
	},

	deserializeAcetateView(state) {
		return new AcetateView(state)
	},

	setIconService: IconService.setIconService.bind(IconService),
}
