export class Futoshiki {
	private _guessId: number
	private _saves: {
		[Key: string]: {	// name of the save
			[Key: string]: { // cell key
				default: number,
				value: number,
				greaterThan: string[],
				lesserThan: string[],
				suggestions: number[]
			}
		}
	}

	constructor(size: number) {
		this._size = size
		this._futoshiki = {}
		this._constrains = {}
		this._solveSteps = []
		this._generateSteps = {}
		this._guessId = 0
		this._saves = {}
		// Build the main futoshiki variable
		for (let row = 0; row < size; row++) {
			for (let col = 0; col < size; col++) {
				this._futoshiki[this.makeCellKey(col, row)] = new FutoshikiCell(col, row, this._size, null)
			}
		}

		return this;
	}

	get contradictions(): string[] {
		try {
			this._checkForContradictions()
		}catch(errors){
			return errors
		}
		return []
	}

	private _generateSteps: { [Key: string]: string }

	get generateSteps(): { [p: string]: string } {
		return this._generateSteps;
	}

	private _solveSteps: string[]

	get solveSteps(): string[] {
		return this._solveSteps;
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
		// console.log(col, row, value, isDefault)
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
		let constraintKey = this.makeConstraintKey(...A, ...B)

		// Set the constraint key by value (and it's the "default" values)
		this._constrains[constraintKey.key] = constraintKey.sign

		// This can be generated automatically.
		const keyA = this.makeCellKey(...A),
			keyB = this.makeCellKey(...B)
		this._futoshiki[keyA].setLesserThan(keyB)
		this._futoshiki[keyB].setGreaterThan(keyA)

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
							col = (tblCol - 1) / 2
						const leftCell = this.getCell(col, row),
							rightCell = this.getCell(col + 1, row)
						let sign = ""

						if (leftCell.isLesserThan(rightCell)) {
							sign = CONSTRAINT_VALUES.lesser
						} else if (leftCell.isGreaterThan(rightCell)) {
							sign = CONSTRAINT_VALUES.greater
						}

						td.push(`<td class="futoshiki-constraint-v ${sign}"></td>`)
					}

					if (tblRow % 2 === 1 && tblCol % 2 === 0) {
						// get the contraint: same col, adjacent rows
						const row = (tblRow - 1) / 2,
							col = tblCol / 2
						const topCell = this.getCell(col, row),
							bottomCell = this.getCell(col, row + 1)
						let sign = ""

						if (topCell.isLesserThan(bottomCell)) {
							sign = CONSTRAINT_VALUES.lesser
						} else if (topCell.isGreaterThan(bottomCell)) {
							sign = CONSTRAINT_VALUES.greater
						}
						td.push(`<td class="futoshiki-constraint-h ${sign}"></td>`)
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

	save(name: string) {
		this._saves[name] = {}
		this.cells.forEach(cell => {
			this._saves[name][cell.cellKey] = {
				default: cell.default,
				value: cell.userValue,
				lesserThan: [...cell.lesserThan],
				greaterThan: [...cell.greaterThan],
				suggestions: [...cell.suggestion]

			}
		})
	}

	restore(name: string): boolean {
		if (this._saves[name] === undefined) {
			return false
		}

		for (const [key, cell] of Object.entries(this._saves[name])) {
			this._futoshiki[key].value = cell.value
			this._futoshiki[key].default = cell.default
			this._futoshiki[key].greaterThan = [...cell.greaterThan]
			this._futoshiki[key].lesserThan = [...cell.lesserThan]
			this._futoshiki[key].suggestion = [...cell.suggestions]
		}

		return true
	}

	generate(): boolean {
		// Generate the values
		this._generateValues()
		// Generate the signs
		this._generateSigns()

		// Store the solution values.
		this.save('solution')
		// Make an output
		this._generateSteps['solution'] = this.toHtml()

		// Make a first initialisation (and save it to "init" key)
		this._generateInit()

		// Try to see if it's solvable.
		let initLoop = 0
		while (!this.isSolvable('solution') && initLoop < 100) {
			this._generateInit()
			initLoop++
		}
		// console.log(`Generation: number of initial loops = ${initLoop}`)

		// Restore the before solving.
		// this.restore('init')
		this._generateSteps['init'] = this.toHtml()

		// Reduce the number of given elements => increase difficulty.
		let optimizeCount = 0
		while (optimizeCount < 100) {
			this._generateOptimize(optimizeCount)
			optimizeCount++
		}
		// console.log(`Generation: optimization count = ${optimizeCount}`)

		this._generateSteps['optimized'] = this.toHtml()

		return false
	}

	solve(init: boolean = true): boolean {
		/*
		Solving process
		1. reduce by value and orphan suggestion
		2. if not solved, make a guess
		3. back to 1.
		 */

		// Store the solve steps.
		if (init) {
			this._solveSteps = []
			this._solveSteps.push(this.toHtml())
		}

		// Set all suggestion to default.
		this._initSolveSugestion()

		// First resolution (using "difficulty 1")
		let solved = this._solveLoop(0)

		if (solved) {
			return true
		}

		// The Futoshiki is not yet solved. We need to make some guesses.
		solved = this._solveWithGuess(2)

		return solved
	}

	isSolved(): boolean {
		try {
			this._checkForContradictions()
		} catch {
		}

		return this.cells.every(cell => cell.value)
	}

	isSolvable(restoreKeyOnUnsolvable: string): boolean {
		const keySolvable = 'save_temp',
			keyUnSolvable = restoreKeyOnUnsolvable ?? 'save_temp'

		this.save(keySolvable)

		const result = this.solve()

		if (result) {
			this.restore(keySolvable)
		} else {
			this.restore(keyUnSolvable)
		}

		if (this._saves['save_temp'] !== undefined) {
			delete this._saves['save_temp']
		}


		return result
	}

	private _generateInit(): void {
		// Remove a number of variables values.
		const ratio = 0.75
		let numberOfRemovedItems = 0
		this.cells.forEach(cell => {
			if (Math.random() < ratio) {
				// Remove a value
				cell.default = null
				numberOfRemovedItems++
			}
			cell.greaterThan.forEach(cellKey => {
				if (Math.random() < ratio) {
					cell.removeGreaterThan(cellKey)
					this._futoshiki[cellKey].removeLesserThan(cell.cellKey)
					numberOfRemovedItems++
				}
			})

			cell.lesserThan.forEach(cellKey => {
				if (Math.random() < ratio) {
					cell.removeLesserThan(cellKey)
					this._futoshiki[cellKey].removeGreaterThan(cell.cellKey)
					numberOfRemovedItems++
				}
			})
		})

		this.save('init')
		// console.log('Removed items: ', numberOfRemovedItems)
	}

	private _generateOptimize(optimizeId: number): boolean {
		// Save before trying to optimize.
		this.save(`optimize-${optimizeId}`)

		// Get a random cell with any value.
		const cellsWithValues = this.cells.filter(cell => cell.default !== null || cell.lesserThan.length > 0 || cell.greaterThan.length > 0)
		const cell: FutoshikiCell = randomItem(cellsWithValues)

		if (cell !== null) {
			let available: string[] = []
			if (cell.default !== null) {
				available.push('default')
			}
			if (cell.lesserThan.length > 0) {
				available.push('lesserThan')
			}
			if (cell.greaterThan.length > 0) {
				available.push('greaterThan')
			}

			let keyToRemove: string,
				whatToRemove = randomItem(available)

			switch (whatToRemove) {
				case 'default':
					this._futoshiki[cell.cellKey].default = null
					break
				case 'lesserThan':
					keyToRemove = randomItem(cell.lesserThan)
					this._futoshiki[cell.cellKey].removeLesserThan(keyToRemove)
					this._futoshiki[keyToRemove].removeGreaterThan(cell.cellKey)
					break
				case 'greaterThan':
					keyToRemove = randomItem(cell.greaterThan)
					this._futoshiki[cell.cellKey].removeGreaterThan(keyToRemove)
					this._futoshiki[keyToRemove].removeLesserThan(cell.cellKey)
					break
			}

			return this.isSolvable(`optimize-${optimizeId}`)
		}

		return false

	}

	private _generateValues(): boolean {
		// Init the values
		this.cells.forEach(cell => cell.reset)

		// Fill the Futoshiki with values
		// - for a cell, find all previous cells (left and above) and remove the availability.
		let pos = 0,
			maxBacktracking = 0
		while (pos < this._size && maxBacktracking < 500) {
			this.getCellsInARow(pos).forEach(cell => {
				if (cell.default === null) {
					// Get all cells above and on the right.
					const existingValues = this.cells.filter(searchCell => {
						return (searchCell.row === cell.row && searchCell.col < cell.col) || // same line or same col
							(searchCell.col === cell.col && searchCell.row < cell.row)
					}).map(searchCell => searchCell.default)

					const values = this.makeAvailableValues().filter(x => existingValues.indexOf(x) === -1)

					if (values.length > 0) {
						cell.default = randomItem(values)
					}
				}
			})

			// Check if the row was filled
			if (this.getCellsInARow(pos).some(cell => cell.default === null)) {
				// If not all element where filled, try another solution.
				this.getCellsInARow(pos - 1).forEach(cell => cell.default = null)
				this.getCellsInARow(pos).forEach(cell => cell.default = null)
				pos--
			} else {
				pos++
			}

			maxBacktracking++
		}

		return true
	}

	private _generateSigns(): boolean {
		this.cells.forEach(cell => {
			this.getAdjacentCells(cell).forEach(adjacentCell => {
				if (adjacentCell.default > cell.default) {
					this.addConstraint([cell.col, cell.row], [adjacentCell.col, adjacentCell.row])
				}
			})
		})
		return true
	}

	private makeAvailableValues(): number[] {
		return [...Array(this._size).keys()].map(x => x + 1)
	}

	private toggleSuggestionByKey(key: string, value: number) {
		this._futoshiki[key].toggleSuggestion(value)
	}

	private _initSolveSugestion(): void {
		for (let key in this._futoshiki) {
			this._futoshiki[key].fillSuggestion()
		}
	}

	private _solveWithGuess(numberOfSuggestion): boolean {
		// Find the first cell with <numberOfSuggestion> suggestion and choose the first and check until there is a contradiction
		const guessCells = this.cells.filter(cell => cell.suggestion.length === numberOfSuggestion)
		let solutionsCount = 0

		// A corresponding cell (with the correct number of suggestion) has been found.
		if (guessCells.length > 0) {
			// Store the cells suggestions
			this._guessId++
			this.cells.forEach(cell => cell.guessStore(this._guessId))
			// Grab the first correspondind cell
			const guessCell = guessCells[0]

			// Go through each remaining solution and try to
			// 1. find a contradiction
			// 2. determine as unresolvable
			// 3. find a solution.
			// Test the result with the first suggestion


			guessCell.suggestion.forEach(suggestion => {
				// Restore the guesses.
				this.cells.forEach(cell => cell.guessRestore(this._guessId))

				// Set the suggestion
				this.futoshiki[guessCell.cellKey].value = suggestion

				// Try to solve using the normal way.
				try {
					let solved = this._solveLoop(numberOfSuggestion)
					if (solved) {
						solutionsCount++
					}
				} catch (e) {
					// Contradiction !
				}
			})
		}

		// console.log('Using guess to resolve: ', solutionsCount)
		return solutionsCount === 1
	}

	// @ts-ignore
	private _solveLoop(iteration?: number): boolean {
		let wasModified = true,
			loopCount: number = 0

		while (wasModified && loopCount < 10000) {
			// Build the "checking string"
			const check = this._solveToString()

			// For every known value, remove the suggestion in row and col
			this._solveReduceSuggestionByValue()

			// For every cell with a greater / lower than other cell, modify the suggestion.
			this._solveReduceSuggestionByAdjacent()
			this._solveReduceSuggestionByValue()

			// On a row or a column, check if a suggestion value is only in one cell.
			this._solveFindOrphanValueInSuggestion(this.rows)
			this._solveReduceSuggestionByValue()
			this._solveFindOrphanValueInSuggestion(this.cols)
			this._solveReduceSuggestionByValue()

			wasModified = check !== this._solveToString()
			loopCount++
		}

		return this.isSolved()
	}

	private _solveToString(): string {
		let str: string[] = []
		this.cells.forEach(cell => {
			str.push(cell.value ? `v${cell.value}` : cell.suggestion.join(","))
		})
		return str.join(";")
	}

	private _checkForContradictions() {
		let contradictionArray: string[] = []
		// Detect if two same value are in the same row.
		this.rows.forEach((lineCells, index) => {
			const lineValues = lineCells
				.map(cell => cell.value)
				.filter(value => value > 0)

			if (lineValues.length !== new Set(lineValues).size) {
				contradictionArray.push(`contradiction in line ${index + 1}`)
			}
		})

		// Detect if two same value are in the same column.
		this.cols.forEach((lineCells, index) => {
			const lineValues = lineCells
				.map(cell => cell.value)
				.filter(value => value > 0)

			if (lineValues.length !== new Set(lineValues).size) {
				contradictionArray.push(`contradiction in column ${index + 1}`)
			}
		})

		// Detect if a cell has no value and no suggestion.
		this.cells.forEach(cell => {
			if (cell.value === null && cell.default === null && cell.suggestion.length === 0) {
				contradictionArray.push(`contradiction in cell ${cell.cellKey}: no value possible`)
			}
		})

		// Detect if a cell is correctly greater or lesser than another cell.
		this.cells.forEach(cell => {
			cell.lesserThan.forEach(c => {
				if (cell.value > this.futoshiki[c].value) {
					contradictionArray.push(`contradiction in cell ${cell.cellKey} - it's not lesser than ${c}`)
				}
			})
			cell.greaterThan.forEach(c => {
				if (cell.value < this.futoshiki[c].value) {
					contradictionArray.push(`contradiction in cell ${cell.cellKey} - it's not greater than ${c}`)
				}
			})
		})

		if(contradictionArray.length>0){
			throw contradictionArray
		}
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

		this._checkForContradictions()
		// If there was any change, redo this script.
		if (check !== this._solveToString()) {
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

		this._checkForContradictions()
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
		reverse: boolean,
		sign: CONSTRAINT_VALUES
	} {
		if (
			(rowA < rowB) ||
			(rowA === rowB && colA < colB)
		) {
			return {
				key: `${this.makeCellKey(colA, rowA)}_${this.makeCellKey(colB, rowB)}`,
				reverse: false,
				sign: CONSTRAINT_VALUES.lesser
			}
		}

		return {
			key: `${this.makeCellKey(colB, rowB)}_${this.makeCellKey(colA, rowA)}`,
			reverse: true,
			sign: CONSTRAINT_VALUES.greater
		}
	}
}

class FutoshikiCell {
	constructor(col: number, row: number, size: number, dftValue: number) {
		this._col = col
		this._row = row
		this._size = size
		this.reset()

		// Set default value
		this._default = dftValue ? dftValue : null
	}

	private _guesses: {
		[key: number]: { value: number, suggestions: number[] }
	}

	get guesses(): { [p: number]: { value: number; suggestions: number[] } } {
		return this._guesses;
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

	get userValue(): number {
		return this._value
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

	set greaterThan(value: string[]) {
		this._greaterThan = value;
	}

	private _lesserThan: string[]

	get lesserThan(): string[] {
		return this._lesserThan;
	}

	set lesserThan(value: string[]) {
		this._lesserThan = value;
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

	reset(): void {
		this._default = null
		this._value = null
		this._suggestion = []
		this._lesserThan = []
		this._greaterThan = []
		this._guesses = {}
	}

	setGreaterThan(cellKey: string) {
		this._greaterThan.push(cellKey)
	}

	setLesserThan(cellKey: string) {
		this._lesserThan.push(cellKey)
	}

	removeGreaterThan(cellKey: string) {
		const idx = this._greaterThan.indexOf(cellKey)
		if (idx !== -1) {
			this._greaterThan.splice(idx, 1)
		}
	}

	removeLesserThan(cellKey: string) {
		const idx = this._lesserThan.indexOf(cellKey)
		if (idx !== -1) {
			this._lesserThan.splice(idx, 1)
		}
	}

	isGreaterThan(cell: FutoshikiCell): boolean {
		return this._greaterThan.indexOf(cell.cellKey) !== -1
	}

	isLesserThan(cell: FutoshikiCell): boolean {
		return this._lesserThan.indexOf(cell.cellKey) !== -1
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

function randomArray(arr: any[], number?: number): any[] {
	if (number === undefined) {
		number = 1
	}

	// Return a clone array
	if (arr.length <= 0) {
		return Object.values(arr)
	}

	// Randomize the array and return the n first elements.
	return shuffleArray(arr).slice(0, number);
}

function randomItem(arr: any[]): any {
	if (arr.length === 0) {
		return null
	}
	return randomArray(arr, 1)[0]
}

function shuffleArray(arr: any[]): any[] {
	// The Fisher-Yates algorithm
	let shuffleArray = Object.values(arr)
	for (let i = shuffleArray.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = shuffleArray[i];
		shuffleArray[i] = shuffleArray[j];
		shuffleArray[j] = temp;
	}

	return shuffleArray;
}
