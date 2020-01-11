'use babel'

import AcetateView from './acetate-view'
import { CompositeDisposable } from 'atom'
import path from 'path'

export default {
	views: new Set(),
	subscriptions: null,

	activate(state) {
		this.subscriptions = new CompositeDisposable()

		this.subscriptions.add(
			atom.commands.add('atom-workspace', {
				'acetate:open-folder': () => this.openFolder(),
			}),
		)
	},

	deactivate() {
		this.subscriptions.dispose()
		this.views.forEach(view => view.destroy())
	},

	serialize() {
		return Array.from(this.views, view => view.serialize())
	},

	openFolder() {
		const item = atom.workspace.getActivePaneItem()
		if (!item.getPath) {
			return
		}

		const view = new AcetateView({ path: path.dirname(item.getPath()) })

		this.views.add(view)
		this.subscriptions.add(view.onDestroyed(() => this.views.delete(view)))

		const pane = atom.workspace.getActivePane()
		pane.activateItem(view)
	},

	deserializeAcetateView(state) {
		return new AcetateView(state)
	},
}
