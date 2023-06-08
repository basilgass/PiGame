export class Futoshiki {
	private _guessId: number
	private _solveSteps: string[]

	constructor(size: number) {
		this._size = size
		this._futoshiki = {}
		this._constrains = {}
		this._solveSteps = []
		this._guessId = 0
		// Build the main futoshiki variable
		for (let row = 0; row < size; row++) {
			for (let col = 0; col < size; col++) {
				this._futoshiki[this.makeCellKey(col, row)] = new FutoshikiCell(col, row, this._size, null)
			}
		}

		return this;
	}

	private _size: number;

	get size(): number {
		return this._size;
	}

	private _futoshiki: { [key: string]: FutoshikiCell };

	get futoshiki(): { [p: string]: FutoshikiCell } {
		return this._futoshiki;
	}

	private _constrains: { [key: string]: CONSTRAINT_VALUES };

	get constrains(): { [p: string]: CONSTRAINT_VALUES } {
		return this._constrains;
	}

	get cells(): FutoshikiCell[] {
		return Object.values(this._futoshiki)
	}

	get rows(): FutoshikiCell[][] {
		let arr = []
		for (let i = 0; i < this._size; i++) {
			arr.push(this.getCellsInARow(i))
		}
		return arr
	}


	get solveSteps(): string[] {
		return this._solveSteps;
	}

	get cols(): FutoshikiCell[][] {
		let arr = []
		for (let i = 0; i < this._size; i++) {
			arr.push(this.getCellsInAColumn(i))
		}
		return arr
	}

	getCell(col: number, row: number): FutoshikiCell {
		return this.cells.filter(c => c.row === row && c.col === col)[0]
	}

	addValue(col: number, row: number, value: number, isDefault?: boolean): Futoshiki {
		console.log(col, row, value, isDefault)
		if (isDefault) {
			this._futoshiki[`${col}:${row}`].default = value
		} else {
			this._futoshiki[`${col}:${row}`].value = value
		}

		return this
	}

	addValues(values: [number, number, number][], isDefault?: boolean): Futoshiki {
		for (let value of values) {
			this.addValue(...value, isDefault)
		}

		return this
	}

	addConstraint(A: [number, number], B: [number, number]): Futoshiki {
		// This is only for display
		// TODO: Remove this._constrains
		let constraintKey = this.makeConstraintKey(...A, ...B)
		this._constrains[constraintKey.key] = constraintKey.reverse ? CONSTRAINT_VALUES.greater : CONSTRAINT_VALUES.lesser


		const keyA = this.makeCellKey(...A),
			keyB = this.makeCellKey(...B)
		this._futoshiki[keyA].isLesserThan(keyB)
		this._futoshiki[keyB].isGreaterThan(keyA)

		return this
	}

	addConstraints(values: [number, number, number, number][]): Futoshiki {
		for (let constrain of values) {
			this.addConstraint(
				[constrain[0], constrain[1]],
				[constrain[2], constrain[3]]
			)
		}

		return this
	}

	toggleSuggestion(col: number, row: number, value: number): void {
		this.toggleSuggestionByKey(this.makeCellKey(col, row), value)
	}

	toHtml(): string {
		// Build the display, in a table structure.
		let tr: (string[])[] = []

		for (let tblRow = 0; tblRow < this._size * 2 - 1; tblRow++) {
			// create a new tow
			let td: string[] = []
			for (let tblCol = 0; tblCol < this._size * 2 - 1; tblCol++) {
				// create a new cell
				if (tblRow % 2 === 0 && tblCol % 2 === 0) {
					// it's a number cell
					const row = tblRow / 2,
						col = tblCol / 2

					td.push(`<td class="futoshiki-cell" data-row="${row}" data-col="${col}"><div>${this._futoshiki[`${col}:${row}`].value ? "" : this.suggestionDiv(col, row)}${this._futoshiki[`${col}:${row}`].value ?? ""}</div></td>`)
				} else {
					// It's a constraint or a corner.
					if (tblRow % 2 === 1 && tblCol % 2 === 1) {
						td.push(`<td class="futoshiki-corner"></td>`)
					}

					if (tblRow % 2 === 0 && tblCol % 2 === 1) {
						// Get the constraint: same row, adjacent columns
						const row = tblRow / 2,
							col = (tblCol - 1) / 2,
							constraintKey = this.makeConstraintKey(col, row, col + 1, row)

						td.push(`<td class="futoshiki-constraint-v ${this._constrains[constraintKey.key] ?? ""}"></td>`)
					}

					if (tblRow % 2 === 1 && tblCol % 2 === 0) {
						// get the contraint: same col, adjacent rows
						const row = (tblRow - 1) / 2,
							col = tblCol / 2,
							constraintKey = this.makeConstraintKey(col, row, col, row + 1)

						td.push(`<td class="futoshiki-constraint-h ${this._constrains[constraintKey.key] ?? ""}"></td>`)
					}

				}

			}
			tr.push(td)
		}

		// set the html to the dic.
		return `<table class="futoshiki">${tr.map(row => `<tr>${row.join("\n")}</tr>`).join("\n")}</table>`
	}

	getCellValue(col: number, row: number): number {
		const key = this.makeCellKey(col, row)

		return this.getCellValueByKey(key)

	}

	solve(maxIteration: number = 100): boolean {
		this._solveSteps = []
		this._solveSteps.push(this.toHtml())

		this._initSolveSugestion()

		let iteration = 0,
			wasModified = true


		while (iteration < maxIteration && wasModified) {
			// Solve loop and detect if it was modified.
			wasModified = this._solveLoop(iteration)

			// increment
			iteration++

			// The game is solved - exit the loop
			if(this.isSolved()){break}
		}

		console.log(`Iteration number: ${iteration}`)
		console.log(`The futoshiki is solved ? ${this.isSolved()}`)

		if(!this.isSolved()){
			// Find the first cell with TWO suggestion and choose the first and check until there is a contradiction
			const guessCells = this.cells.filter(cell=>cell.suggestion.length===2)
			if(guessCells.length>0){
				// Store the cells.
				this._guessId++
				this.cells.forEach(cell=>cell.guessStore(this._guessId))
				const guessCell = guessCells[0]

				guessCell.value = guessCell.suggestion[1]
				try {
					this.solve(maxIteration)
				}catch(e){
					// Restore the guesses.
					this.cells.forEach(cell=>cell.guessRestore(this._guessId))
					guessCell.value = guessCell.suggestion[0]
					this.solve(maxIteration)
				}
			}
		}

		// The game is not solvable or has more than one solution
		return false
	}

	private toggleSuggestionByKey(key: string, value: number) {
		this._futoshiki[key].toggleSuggestion(value)
	}

	private _initSolveSugestion(): void {
		for (let key in this._futoshiki) {
			this._futoshiki[key].fillSuggestion()
		}
	}

	private _solveLoop(iteration?: number): boolean {
		const check = this._solveToString()

		// For every known value, remove the suggestion in row and col
		this._solveReduceSuggestionByValue()

		// For every cell with a greater / lower than other cell, modify the suggesion.
		this._solveReduceSuggestionByAdjacent()
		this._solveReduceSuggestionByValue()

		// On a row or a column, check if a suggestion value is only in one cell.
		this._solveFindOrphanValueInSuggestion(this.rows)
		this._solveReduceSuggestionByValue()
		this._solveFindOrphanValueInSuggestion(this.cols)
		this._solveReduceSuggestionByValue()

		return check !== this._solveToString()
	}

	isSolved(): boolean {
		return this.cells.every(cell=>cell.value)
	}
	private _solveToString(): string {
		let str: string[] = []
		this.cells.forEach(cell => {
			str.push(cell.value ? `v${cell.value}` : cell.suggestion.join(","))
		})
		return str.join(";")
	}

	private _solveHasContradiction() {
		this.rows.forEach(lineCells=>{
			const lineValues = lineCells
				.map(cell=>cell.value)
				.filter(value=>value>0)

			if(lineValues.length !== new Set(lineValues).size){
				throw "contradiction"
			}
		})
	}
	private _solveReduceSuggestionByValue() {
		const check = this._solveToString()
		// This loop must be done until there is no more changes.
		for (let cell of this.cells) {
			// There is a value (default or given)
			if (cell.value !== null) {
				// Remove the cell value to all orthogonal cells suggestion.
				this.getOrthogonalCells(cell, true)
					.forEach(c => {
						c.removeSuggestion(cell.value)
						c.simplifySuggestion()
					})
			}
		}

		this._solveSteps.push(this.toHtml())

		this._solveHasContradiction()
		// If there was any change, redo this script.
		if(check!==this._solveToString()){
			this._solveReduceSuggestionByValue()
		}
	}

	private _solveReduceSuggestionByAdjacent() {
		for (let cell of this.cells) {
			this.getAdjacentCells(cell)
				.forEach(c => {
					if (cell.lesserThan.includes(c.cellKey)) {
						// Remove the lowest suggestion
						cell.removeSuggestionGreaterOrEqualTo(c.greatestSuggestion)
					}
					if (cell.greaterThan.includes(c.cellKey)) {
						cell.removeSuggestionLesserOrEqualTo(c.lowestSuggestion)
					}


					c.simplifySuggestion()
				})
		}

		this._solveSteps.push(this.toHtml())

		this._solveHasContradiction()
	}

	private _solveFindOrphanValueInSuggestion(linesOfCells: FutoshikiCell[][]) {
		// Detect if there was a modification

		// For each line, find cells where a suggestion is the only place.
		linesOfCells.forEach(lineCells => {
			let suggestionCount: { [key: number]: number } = {},
				dualCount: { [key: string]: number } = {}

			lineCells.forEach(cell => {
				// Sort the suggestion
				cell.suggestion.sort()

				// Count the various suggestions
				cell.suggestion.forEach(value => {
					if (suggestionCount[value]) {
						suggestionCount[value]++
					} else {
						suggestionCount[value] = 1
					}
				})

				// Detect dual suggestions
				if (cell.suggestion.length === 2) {
					const key = cell.suggestion.join(",")
					dualCount[key] = (dualCount[key] ?? 0) + 1
				}
			})

			// Modify single items (but most not be already in the line).
			for (let value in suggestionCount) {
				if (suggestionCount[value] === 1) {
					// Find the only cell with this value.
					lineCells.forEach(cell => {
						if (cell.suggestion.includes(+value)) {
							cell.value = +value
						}
					})
				}
			}

			// Modify dual items
			for (let key in dualCount) {
				if (dualCount[key] === 2) {
					// These two values are only possible for the two cells. Remove the values from other cells.
					let values = key.split(',').map(x => +x)
					lineCells.forEach(cell => {
						if (!(cell.suggestion.length === 2 && key === cell.suggestion.join(","))
						) {
							values.forEach(value => cell.removeSuggestion(value))
						}
					})
				}
			}
		})

		this._solveSteps.push(this.toHtml())

	}

	private suggestionDiv(col: number, row: number): string {
		let suggestions = this._futoshiki[this.makeCellKey(col, row)].suggestion,
			div: string[] = []

		for (let i = 0; i < this._size; i++) {
			if (suggestions.indexOf(i + 1) !== -1) {
				div.push(`<div>${i + 1}</div>`)
			} else {
				div.push(`<div></div>`)
			}
		}

		return `<div class="futoshiki-cell-suggestion">${div.join("")}</div>`
	}

	private getCellAbove(cell): FutoshikiCell {
		const cells = this.cells.filter(c => {
			return c.row === cell.row - 1 && c.col === cell.col
		})

		return cells.length === 1 ? cells[0] : null;
	}

	private getCellBelow(cell): FutoshikiCell {
		const cells = this.cells.filter(c => {
			return c.row === cell.row + 1 && c.col === cell.col
		})

		return cells.length === 1 ? cells[0] : null;
	}

	private getCellLeft(cell): FutoshikiCell {
		const cells = this.cells.filter(c => {
			return c.row === cell.row && c.col === cell.col - 1
		})

		return cells.length === 1 ? cells[0] : null;
	}

	private getCellRight(cell): FutoshikiCell {
		const cells = this.cells.filter(c => {
			return c.row === cell.row && c.col === cell.col + 1
		})

		return cells.length === 1 ? cells[0] : null;
	}

	private getCellsInARow(row: number): FutoshikiCell[] {

		return Object.values(this.cells).filter(cell => cell.row === row)
	}

	private getCellsInAColumn(col: number): FutoshikiCell[] {
		return Object.values(this.cells).filter(cell => cell.col === col)
	}

	private getOrthogonalCells(refCell: FutoshikiCell, excludeReferenceCell: boolean): FutoshikiCell[] {

		return this.cells.filter(searchCell => {
			if (excludeReferenceCell && searchCell.row === refCell.row && searchCell.col === refCell.col) {
				return false
			}
			return (searchCell.col === refCell.col || searchCell.row === refCell.row)
		})
	}

	private getAdjacentCells(refCell: FutoshikiCell): FutoshikiCell[] {
		return [
			this.getCellAbove(refCell),
			this.getCellBelow(refCell),
			this.getCellLeft(refCell),
			this.getCellRight(refCell)
		].filter(c => c !== null)
	}

	private makeCellKey(col: number, row: number): string {
		return `${col}:${row}`
	}

	private getCellValueByKey(key: string) {
		return this._futoshiki[key].value
	}

	private makeConstraintKey(colA: number, rowA: number, colB: number, rowB: number): {
		key: string,
		reverse: boolean
	} {
		if (
			(rowA < rowB) ||
			(rowA === rowB && colA < colB)
		) {
			return {
				key: `${this.makeCellKey(colA, rowA)}_${this.makeCellKey(colB, rowB)}`,
				reverse: false
			}
		}

		return {
			key: `${this.makeCellKey(colB, rowB)}_${this.makeCellKey(colA, rowA)}`,
			reverse: true
		}
	}
}

class FutoshikiCell {
	private _guesses: {[key: number]: {value: number, suggestions: number[]}}
	constructor(col: number, row: number, size: number, dftValue: number) {
		this._col = col
		this._row = row
		this._size = size
		this._default = dftValue ? dftValue : null
		this._value = null
		this._suggestion = []
		this._lesserThan = []
		this._greaterThan = []
		this._guesses = {}
	}


	get guesses(): { [p: number]: { value: number; suggestions: number[] } } {
		return this._guesses;
	}

	guessStore(id: number) {
		this._guesses[id] = {
			value: this.value,
			suggestions: [...this.suggestion]
		}
	}

	guessRestore(id: number) {
		this.value = this._guesses[id].value
		this.suggestion = this._guesses[id].suggestions
	}

	guessReset(id: number) {
		this.guessRestore(id)
		delete this._guesses[id]
	}
	private _size: number

	get size(): number {
		return this._size;
	}

	private _col: number

	get col(): number {
		return this._col;
	}

	private _row: number

	get row(): number {
		return this._row;
	}

	private _default: number

	get default(): number {
		return this._default;
	}

	set default(value: number) {
		this._default = value;
	}

	private _value: number

	get value(): number {
		if (this._default !== null) {
			return this._default
		}
		return this._value;
	}

	set value(value: number) {
		this._value = value;
	}

	private _suggestion: number[]

	get suggestion(): number[] {
		return this._suggestion;
	}

	set suggestion(value: number[]) {
		this._suggestion = value;
	}

	private _greaterThan: string[]

	get greaterThan(): string[] {
		return this._greaterThan;
	}

	private _lesserThan: string[]

	get lesserThan(): string[] {
		return this._lesserThan;
	}

	get cellKey(): string {
		return `${this._col}:${this._row}`
	}

	get lowestSuggestion(): number {
		if (this.value) {
			return this.value
		}

		if (this._suggestion.length > 0) {
			return Math.min(...this._suggestion)
		}
		return null
	}

	get greatestSuggestion(): number {
		if (this.value) {
			return this.value
		}

		if (this._suggestion.length > 0) {
			return Math.max(...this._suggestion)
		} else {

		}
		return null
	}

	isGreaterThan(cellKey: string) {
		this._greaterThan.push(cellKey)
	}

	isLesserThan(cellKey: string) {
		this._lesserThan.push(cellKey)
	}

	fillSuggestion() {
		this._suggestion = this.value === null ? [...Array(this._size).keys()].map(x => x + 1) : [];
	}

	emptySuggestion() {
		this._suggestion = []
	}

	toggleSuggestion(value: number) {
		const idx = this.suggestion.indexOf(value)

		if (idx === -1) {
			this._suggestion.push(value)
		} else {
			this._suggestion.splice(idx, 1)
		}
	}

	addSuggestion(value: number) {
		// Make sure it's not already in there.
		this._suggestion = [...new Set([...this._suggestion, value])]
	}

	removeSuggestion(value: number): boolean {
		const idx = this.suggestion.indexOf(value)

		if (idx !== -1) {
			this._suggestion.splice(idx, 1)
			return true
		}

		return false
	}

	removeSuggestionGreaterOrEqualTo(value: number): boolean {
		const length = this._suggestion.length
		if (this.value === null) {
			this._suggestion = this._suggestion.filter(x => x < value)
		}

		return this._suggestion.length !== length
	}

	removeSuggestionLesserOrEqualTo(value: number): boolean {
		const length = this._suggestion.length
		if (this.value === null) {
			this._suggestion = this._suggestion.filter(x => x > value)
		}

		return this._suggestion.length !== length
	}

	simplifySuggestion() {
		if (this._suggestion.length === 1) {
			this.value = this._suggestion[0]
			this._suggestion = []
		}
	}
}

enum CONSTRAINT_VALUES {
	greater = "greater-than",
	lesser = "lesser-than"
}
