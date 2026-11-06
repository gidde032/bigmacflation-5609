// @ts-nocheck
// This dependency-free Node test runs at runtime; the app does not include @types/node.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const renderedPage = readFileSync(resolve(root, 'build/index.html'), 'utf8');
const appCss = readFileSync(resolve(root, 'src/app.css'), 'utf8');
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const readme = readFileSync(resolve(root, 'README.md'), 'utf8');
const chartComponent = readFileSync(
	resolve(root, 'src/lib/components/ChartPlaceholder.svelte'),
	'utf8'
);
const chartCssMatch = chartComponent.match(/<style>([\s\S]*?)<\/style>/);

assert.ok(chartCssMatch, 'ChartPlaceholder must keep its component styles');
const chartCss = chartCssMatch[1];

const voidTags = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr'
]);

function parseAttributes(source) {
	const attributes = Object.create(null);
	const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/g;

	for (const match of source.matchAll(attributePattern)) {
		const name = match[1].toLowerCase();
		attributes[name] = match[2] ?? match[3] ?? match[4] ?? '';
	}

	return attributes;
}

function parseMarkup(source) {
	const document = { tagName: '#document', attributes: {}, children: [], parent: null };
	const stack = [document];
	const tagPattern = /<!--[\s\S]*?-->|<![^>]*>|<\/?[a-zA-Z][^<>]*>/g;

	for (const match of source.matchAll(tagPattern)) {
		const rawTag = match[0];
		if (rawTag.startsWith('<!--') || rawTag.startsWith('<!')) continue;

		const rawTextParent = stack.at(-1);
		if (
			(rawTextParent.tagName === 'script' || rawTextParent.tagName === 'style') &&
			!new RegExp('^</' + rawTextParent.tagName + '\\s*>$', 'i').test(rawTag)
		) {
			continue;
		}

		const closingTag = rawTag.match(/^<\/\s*([a-z][a-z0-9:-]*)\s*>$/i);
		if (closingTag) {
			const tagName = closingTag[1].toLowerCase();
			for (let index = stack.length - 1; index > 0; index -= 1) {
				if (stack[index].tagName === tagName) {
					stack.length = index;
					break;
				}
			}
			continue;
		}

		const openingTag = rawTag.match(/^<\s*([a-z][a-z0-9:-]*)([\s\S]*?)\/?>$/i);
		if (!openingTag) continue;

		const tagName = openingTag[1].toLowerCase();
		const attributeSource = openingTag[2].replace(/\/\s*$/, '');
		const element = {
			tagName,
			attributes: parseAttributes(attributeSource),
			children: [],
			parent: stack.at(-1)
		};
		stack.at(-1).children.push(element);

		if (!voidTags.has(tagName) && !/\/\s*>$/.test(rawTag)) {
			stack.push(element);
		}
	}

	return document;
}

function descendants(element) {
	const result = [];
	for (const child of element.children) {
		result.push(child, ...descendants(child));
	}
	return result;
}

function nearestAncestor(element, tagName) {
	for (let parent = element.parent; parent; parent = parent.parent) {
		if (parent.tagName === tagName) return parent;
	}
	return null;
}

const elements = descendants(parseMarkup(renderedPage));
const idElements = elements.filter((element) => element.attributes.id);
const ids = new Set(idElements.map((element) => element.attributes.id));

function cssDeclaration(css, selector, property) {
	const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
	let value;

	for (const rule of rules) {
		const selectors = rule[1]
			.replace(/\/\*[\s\S]*?\*\//g, '')
			.split(',')
			.map((item) => item.trim());
		if (!selectors.includes(selector)) continue;

		const declaration = rule[2].match(
			new RegExp('(?:^|;)\\s*' + property + '\\s*:\\s*([^;]+)', 'm')
		);
		if (declaration) value = declaration[1].trim().replace(/\s+/g, ' ');
	}

	assert.ok(value, 'Missing ' + property + ' declaration for ' + selector);
	return value;
}

function cssColor(css, selector, property) {
	const value = cssDeclaration(css, selector, property);
	const variable = value.match(/^var\((--[\w-]+)\)$/);
	return variable ? cssDeclaration(appCss, ':root', variable[1]) : value;
}

function mediaBlock(css, marker) {
	const markerIndex = css.indexOf(marker);
	assert.notEqual(markerIndex, -1, 'Missing responsive rule ' + marker);

	const openBrace = css.indexOf('{', markerIndex);
	let depth = 0;
	for (let index = openBrace; index < css.length; index += 1) {
		if (css[index] === '{') depth += 1;
		if (css[index] === '}') {
			depth -= 1;
			if (depth === 0) return css.slice(openBrace + 1, index);
		}
	}

	assert.fail('Unclosed responsive rule ' + marker);
}

function parseHexColor(color) {
	const match = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
	assert.ok(match, 'Expected a solid hex color, received ' + color);

	const digits =
		match[1].length === 3
			? [...match[1]].map((digit) => digit + digit).join('')
			: match[1];

	return [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16) / 255);
}

function relativeLuminance(color) {
	const channels = parseHexColor(color).map((channel) =>
		channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
	);
	return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(foreground, background) {
	const luminances = [relativeLuminance(foreground), relativeLuminance(background)].sort(
		(left, right) => right - left
	);
	return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

function assertContrast(name, foreground, background, minimum = 4.5) {
	const ratio = contrastRatio(foreground, background);
	assert.ok(
		ratio >= minimum,
		name +
			' has ' +
			ratio.toFixed(2) +
			':1 contrast (' +
			foreground +
			' on ' +
			background +
			'); requires at least ' +
			minimum +
			':1'
	);
}

function assertRadiusNear(css, selector, expectedValues, tolerance, label) {
	const radius = cssDeclaration(css, selector, 'border-radius');
	const actualValues = [...radius.matchAll(/(\d+(?:\.\d+)?)px/g)].map((match) =>
		Number(match[1])
	);

	assert.equal(
		actualValues.length,
		expectedValues.length,
		label + ' should keep its expected number of corner radii'
	);
	actualValues.forEach((value, index) => {
		assert.ok(
			Math.abs(value - expectedValues[index]) <= tolerance,
			label +
				' corner ' +
				(index + 1) +
				' is ' +
				value +
				'px; expected within ' +
				tolerance +
				'px of ' +
				expectedValues[index] +
				'px'
		);
	});
}

test('the five story sections keep their order and named anchors', () => {
	const expectedSections = [
		'introduction',
		'price-rankings',
		'affordability-map',
		'inflation-comparison',
		'conclusions'
	];
	const sections = elements.filter((element) => element.tagName === 'section');
	const sectionIds = sections.map((section) => section.attributes.id);

	assert.deepEqual(sectionIds, expectedSections);

	for (const section of sections) {
		assert.ok(
			ids.has(section.attributes['aria-labelledby']),
			'Section ' + section.attributes.id + ' must reference its heading'
		);
	}

	const fragmentLinks = elements
		.filter((element) => element.tagName === 'a')
		.map((element) => element.attributes.href ?? '')
		.filter((href) => href.startsWith('#'));
	for (const target of ['price-rankings', 'affordability-map', 'inflation-comparison', 'conclusions']) {
		assert.ok(
			fragmentLinks.includes('#' + target),
			'The page navigation should link to #' + target
		);
	}
});

test('rendered IDs are unique and fragment and ARIA references resolve', () => {
	const counts = new Map();
	for (const element of idElements) {
		const id = element.attributes.id;
		counts.set(id, (counts.get(id) ?? 0) + 1);
	}
	const duplicateIds = [...counts.entries()]
		.filter(([, count]) => count > 1)
		.map(([id, count]) => id + ' (' + count + ')');

	assert.deepEqual(duplicateIds, [], 'Rendered page IDs must be unique');

	const idReferenceAttributes = [
		'aria-labelledby',
		'aria-describedby',
		'aria-controls',
		'aria-owns',
		'aria-activedescendant',
		'aria-details',
		'aria-errormessage'
	];
	for (const element of elements) {
		for (const attribute of idReferenceAttributes) {
			const value = element.attributes[attribute];
			if (!value) continue;
			for (const target of value.trim().split(/\s+/)) {
				assert.ok(
					ids.has(target),
					'<'
						+ element.tagName
						+ '> '
						+ attribute
						+ ' points to missing ID '
						+ target
				);
			}
		}

		const href = element.attributes.href ?? '';
		if (href.startsWith('#') && href.length > 1) {
			assert.ok(ids.has(href.slice(1)), 'Fragment link points to missing ID ' + href.slice(1));
		}
	}
});

test('one chart region stays inside each intended chart section', () => {
	const expectedChartSections = ['price-rankings', 'affordability-map', 'inflation-comparison'];
	const chartRegions = elements.filter((element) => element.attributes['data-chart-region']);

	assert.deepEqual(
		chartRegions.map((element) => element.attributes['data-chart-region']),
		expectedChartSections
	);

	for (const region of chartRegions) {
		const section = nearestAncestor(region, 'section');
		assert.equal(
			section?.attributes.id,
			region.attributes['data-chart-region'],
			'Chart region must remain in the section it represents'
		);
	}
});

test('primary shell text and controls keep accessible contrast on their backdrops', () => {
	const introBackground = cssColor(appCss, '.intro-section', 'background');
	const introPairs = [
		['hero eyebrow', cssColor(appCss, '.eyebrow', 'color'), 4.5],
		['hero title', cssColor(appCss, '.hero-copy h1', 'color'), 3],
		['highlighted hero title', cssColor(appCss, '.hero-copy h1 span', 'color'), 3],
		['hero description', cssColor(appCss, '.hero-lede', 'color'), 4.5],
		['year label', cssColor(appCss, '.year-tag', 'color'), 4.5],
		['hero action', cssColor(appCss, '.primary-link', 'color'), 4.5]
	];
	for (const [name, foreground, minimum] of introPairs) {
		assertContrast(name, foreground, introBackground, minimum);
	}
	assertContrast(
		'page text on the canvas',
		cssColor(appCss, ':root', 'color'),
		cssColor(appCss, ':root', 'background')
	);

	const artBackground = cssColor(appCss, '.hero-art', 'background');
	for (const textSelector of [
		'.art-caption',
		'.layer-callouts b',
		'.layer-callouts small',
		'.art-footnote'
	]) {
		assertContrast(
			textSelector + ' on the hero illustration panel',
			cssColor(appCss, textSelector, 'color'),
			artBackground
		);
	}
	assertContrast(
		'hero scroll marker',
		cssColor(appCss, '.hero-bottom', 'color'),
		introBackground
	);

	const storySurfaces = ['.price-section', '.map-section', '.inflation-section'];
	for (const selector of storySurfaces) {
		const background = cssColor(appCss, selector, 'background');
		assertContrast(
			'section heading on ' + selector,
			cssColor(appCss, '.section-copy h2', 'color'),
			background,
			3
		);
		for (const textSelector of [
			'.chapter-word',
			'.section-deck',
			'.section-detail p',
			'.control-field'
		]) {
			assertContrast(
				textSelector + ' on ' + selector,
				cssColor(appCss, textSelector, 'color'),
				background
			);
		}
	}

	const headerBackground = cssColor(appCss, '.site-header', 'background');
	assertContrast(
		'primary navigation',
		cssColor(appCss, '.site-nav a', 'color'),
		headerBackground
	);
	assertContrast(
		'chapter number',
		cssColor(appCss, '.chapter-number', 'color'),
		cssColor(appCss, '.chapter-number', 'background')
	);
	assertContrast(
		'control value',
		cssColor(appCss, '.select-look', 'color'),
		cssColor(appCss, '.select-look', 'background')
	);
	assertContrast(
		'control chevron',
		cssColor(appCss, '.select-look b', 'color'),
		cssColor(appCss, '.select-look', 'background')
	);

	const chartPaper = cssColor(chartCss, '.chart-head', 'background');
	for (const textSelector of ['.chart-overline', '.chart-head h3', '.chart-unit', '.chart-foot']) {
		assertContrast(
			textSelector + ' on chart paper',
			cssColor(chartCss, textSelector, 'color'),
			chartPaper
		);
	}
	assertContrast(
		'chart placeholder text',
		cssColor(chartCss, '.chart-empty-state', 'color'),
		cssColor(chartCss, '.chart-plot', 'background')
	);
	assertContrast(
		'affordability preview label',
		cssColor(chartCss, '.map-placeholder-text', 'fill'),
		cssColor(chartCss, '.world-map', 'background')
	);
	assertContrast(
		'takeaway number',
		cssColor(appCss, '.takeaway-icon', 'color'),
		cssColor(appCss, '.takeaway-inner', 'background')
	);
	assertContrast(
		'control border against its surface',
		cssColor(appCss, ':root', '--control-border'),
		cssColor(appCss, '.select-look', 'background'),
		3
	);

	const closingBackground = cssColor(appCss, '.closing-section', 'background');
	assertContrast(
		'closing section title',
		cssColor(appCss, '.closing-heading h2', 'color'),
		closingBackground,
		3
	);
	assertContrast(
		'closing section description',
		cssColor(appCss, '.closing-heading > p:last-child', 'color'),
		closingBackground
	);
	assertContrast(
		'closing note',
		cssColor(appCss, '.closing-note', 'color'),
		closingBackground
	);

	const takeawayBackground = cssColor(appCss, '.takeaway-inner', 'background');
	for (const textSelector of ['.takeaway-icon', '.takeaway-inner h3', '.takeaway-inner p']) {
		assertContrast(
			textSelector + ' on takeaway cards',
			cssColor(appCss, textSelector, 'color'),
			takeawayBackground
		);
	}

	const footerBackground = cssColor(appCss, '.site-footer', 'background');
	for (const textSelector of ['.footer-inner', '.data-link', '.back-to-top', '.brand']) {
		assertContrast(
			textSelector + ' on the footer surface',
			cssColor(appCss, textSelector, 'color'),
			footerBackground
		);
	}
});

test('responsive CSS preserves compact and landscape shell structure', () => {
	assert.equal(cssDeclaration(appCss, 'html', 'min-width'), '320px');
	assert.equal(cssDeclaration(appCss, '.chart-region', 'min-width'), '0');

	const tablet = mediaBlock(appCss, '@media (max-width: 900px)');
	assert.equal(
		cssDeclaration(tablet, '.header-inner', 'grid-template-columns'),
		'auto minmax(0, 1fr)'
	);
	assert.equal(
		cssDeclaration(tablet, '.story-inner', 'grid-template-columns'),
		'minmax(12rem, 0.36fr) minmax(0, 1fr)'
	);

	const compact = mediaBlock(appCss, '@media (max-width: 650px)');
	for (const selector of ['.hero-inner', '.story-inner']) {
		assert.equal(
			cssDeclaration(compact, selector, 'grid-template-columns'),
			'minmax(0, 1fr)'
		);
	}
	assert.equal(
		cssDeclaration(compact, '.header-inner', 'grid-template-columns'),
		'minmax(0, 1fr)'
	);
	assert.equal(cssDeclaration(compact, '.site-nav', 'justify-content'), 'flex-start');
	assert.equal(
		cssDeclaration(compact, '.takeaway-grid', 'grid-template-columns'),
		'minmax(0, 1fr)'
	);

	const chartCompact = mediaBlock(chartCss, '@media (max-width: 650px)');
	assert.equal(cssDeclaration(chartCompact, '.chart-plot', 'min-height'), '13rem');
	assert.equal(cssDeclaration(chartCompact, '.chart-plot--map', 'min-height'), '0');
});

test('rounded shell and chart frames stay within the approved radius ranges', () => {
	const appDesktopEnd = appCss.indexOf('@media (max-width: 900px)');
	const chartDesktopEnd = chartCss.indexOf('@media (max-width: 650px)');
	assert.notEqual(appDesktopEnd, -1, 'Desktop shell rules should precede responsive overrides');
	assert.notEqual(chartDesktopEnd, -1, 'Desktop chart rules should precede responsive overrides');
	const appDesktopCss = appCss.slice(0, appDesktopEnd);
	const chartDesktopCss = chartCss.slice(0, chartDesktopEnd);
	const compactAppCss = mediaBlock(appCss, '@media (max-width: 650px)');
	const compactChartCss = mediaBlock(chartCss, '@media (max-width: 650px)');

	// Keep the approved organic frame shapes while allowing small visual refinements.
	assertRadiusNear(appDesktopCss, '.hero-art', [22, 22, 46, 22], 2, 'desktop hero frame');
	assertRadiusNear(compactAppCss, '.hero-art', [18, 18, 34, 18], 2, 'compact hero frame');
	assertRadiusNear(chartDesktopCss, '.chart-frame', [18], 2, 'desktop chart frame');
	assertRadiusNear(compactChartCss, '.chart-frame', [15], 2, 'compact chart frame');
});

test('README documents the dependency-free build-and-test command', () => {
	assert.equal(packageJson.scripts.test, 'npm run build && node --test');
	const normalizedReadme = readme
		.replaceAll(String.fromCharCode(96), '')
		.replace(/\s+/g, ' ');
	assert.ok(
		normalizedReadme.includes(
			'npm test builds the static site and runs the dependency-free shell contract tests.'
		)
	);
});
