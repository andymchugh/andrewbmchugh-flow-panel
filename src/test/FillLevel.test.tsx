import { svgPathBounds } from 'components/FillLevel';

// See https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d
// for source of example paths used in these tests.

test('svgPathBoundsFormatting', () => {
    {
        // M
        let p = document.createElement('path');
        p.setAttribute('d', 'M 20 30 L 50 40 Z');
        const bounds = svgPathBounds(p);
        expect(bounds?.xMin).toEqual(20);
        expect(bounds?.xMax).toEqual(50);
        expect(bounds?.yMin).toEqual(30);
        expect(bounds?.yMax).toEqual(40);
    }
    {
        // M with commas and spaces
        let p = document.createElement('path');
        p.setAttribute('d', 'M, 20,30,L,50,  40,Z');
        const bounds = svgPathBounds(p);
        expect(bounds?.xMin).toEqual(20);
        expect(bounds?.xMax).toEqual(50);
        expect(bounds?.yMin).toEqual(30);
        expect(bounds?.yMax).toEqual(40);
    }
    {
        // M joined to first number
        let p = document.createElement('path');
        p.setAttribute('d', 'M20 30L,50,  40,Z');
        const bounds = svgPathBounds(p);
        expect(bounds?.xMin).toEqual(20);
        expect(bounds?.xMax).toEqual(50);
        expect(bounds?.yMin).toEqual(30);
        expect(bounds?.yMax).toEqual(40);
    }
    {
        // dashes
        let p = document.createElement('path');
        p.setAttribute('d', 'M20-30L50-40Z');
        const bounds = svgPathBounds(p);
        expect(bounds?.xMin).toEqual(20);
        expect(bounds?.xMax).toEqual(50);
        expect(bounds?.yMin).toEqual(-40);
        expect(bounds?.yMax).toEqual(-30);
    }
    {
        // dots
        let p = document.createElement('path');
        p.setAttribute('d', 'M20.0.05L50.0.45Z');
        const bounds = svgPathBounds(p);
        expect(bounds?.xMin).toEqual(20);
        expect(bounds?.xMax).toEqual(50);
        expect(bounds?.yMin).toEqual(0.05);
        expect(bounds?.yMax).toEqual(0.45);
    }
    {
        // dots & dashes
        let p = document.createElement('path');
        p.setAttribute('d', 'M20.0-.05L50.0.45Z');
        const bounds = svgPathBounds(p);
        expect(bounds?.xMin).toEqual(20);
        expect(bounds?.xMax).toEqual(50);
        expect(bounds?.yMin).toEqual(-0.05);
        expect(bounds?.yMax).toEqual(0.45);
    }
    // spaces or commas, no space or space between letters
    // numbers are pairs or singles
    // numbers are abs or relative
  })
  test('svgPathBoundsMm', () => {
    {
        let p = document.createElement('path');
        p.setAttribute('d', `
            M 10,10 h 10
            m  0,10 h 10
            m  0,10 h 10
        `);
        const bounds = svgPathBounds(p);
        expect(bounds?.xMin).toEqual(10);
        expect(bounds?.xMax).toEqual(40);
        expect(bounds?.yMin).toEqual(10);
        expect(bounds?.yMax).toEqual(30);
    }
    {
        let p = document.createElement('path');
        p.setAttribute('d', `
            M 10,10 h 10
            m  0,10 h 10
            m  0,10 h 10
            M 40,20 h 10
            m  0,10 h 10
            m  0,10 h 10
            m  0,10 h 10
            M 50,50 h 10
            m-20,10 h 10
            m-20,10 h 10
            m-20,10 h 10
        `);
        const bounds = svgPathBounds(p);
        expect(bounds?.xMin).toEqual(10);
        expect(bounds?.xMax).toEqual(80);
        expect(bounds?.yMin).toEqual(10);
        expect(bounds?.yMax).toEqual(80);
    }
})

test('svgPathBoundsMLVH', () => {
    {
        let p = document.createElement('path');
        p.setAttribute('d', `
            M 10,10
            L 90,90
            V 10
            H 50
            `);
        const bounds = svgPathBounds(p);
        expect(bounds?.xMin).toEqual(10);
        expect(bounds?.xMax).toEqual(90);
        expect(bounds?.yMin).toEqual(10);
        expect(bounds?.yMax).toEqual(90);
    }
})

test('svgPathBoundsCS', () => {
    {
        let p = document.createElement('path');
        p.setAttribute('d', `
            M 10,90
            C 30,90 25,10 50,10
            S 70,90 90,90
        `);
        const bounds = svgPathBounds(p);
        expect(bounds?.xMin).toEqual(10);
        expect(bounds?.xMax).toEqual(90);
        expect(bounds?.yMin).toEqual(10);
        expect(bounds?.yMax).toEqual(90);
    }
    {
        let p = document.createElement('path');
        p.setAttribute('d', `
            M 110,90
            c 20,0 15,-80 40,-80
            s 20,80 40,80
        `);
        const bounds = svgPathBounds(p);
        expect(bounds?.xMin).toEqual(110);
        expect(bounds?.xMax).toEqual(190);
        expect(bounds?.yMin).toEqual(10);
        expect(bounds?.yMax).toEqual(90);
    }
})

test('svgPathBoundsQt', () => {
    {
        let p = document.createElement('path');
        p.setAttribute('d', `
            M 10,50
            Q 25,25 40,50
            t 30,0 30,0 30,0 30,0 30,0
        `);
        const bounds = svgPathBounds(p);
        expect(bounds?.xMin).toEqual(10);
        expect(bounds?.xMax).toEqual(190);
        expect(bounds?.yMin).toEqual(25);
        expect(bounds?.yMax).toEqual(50);
    }
})

test('svgPathBoundsA', () => {
    {
        let p = document.createElement('path');
        p.setAttribute('d', `
            M 6,10
            A 6 4 10 1 0 14,10
        `);
        const bounds = svgPathBounds(p);
        expect(bounds?.xMin).toEqual(0);
        expect(bounds?.xMax).toEqual(14);
        expect(bounds?.yMin).toEqual(6);
        expect(bounds?.yMax).toEqual(14);
    }
    {
        // join large-arc and sweep flags together into a single string
        let p = document.createElement('path');
        p.setAttribute('d', `
            M 6,10
            A 6 4 10 10 14,10
        `);
        const bounds = svgPathBounds(p);
        expect(bounds?.xMin).toEqual(0);
        expect(bounds?.xMax).toEqual(14);
        expect(bounds?.yMin).toEqual(6);
        expect(bounds?.yMax).toEqual(14);
    }
    {
        // double Arc
        let p = document.createElement('path');
        p.setAttribute('d', `
            M 6,10
            A 6 4 10 1 0 14,10 6 4 10 1 0 20,15
        `);
        const bounds = svgPathBounds(p);
        expect(bounds?.xMin).toEqual(0);
        expect(bounds?.xMax).toEqual(20);
        expect(bounds?.yMin).toEqual(6);
        expect(bounds?.yMax).toEqual(15);
    }
})

test('svgPathBoundsZ', () => {
    {
        let p = document.createElement('path');
        p.setAttribute('d', 'M 20 30 L 50 40 Z m -10 -35');
        const bounds = svgPathBounds(p);
        expect(bounds?.xMin).toEqual(10);
        expect(bounds?.xMax).toEqual(50);
        expect(bounds?.yMin).toEqual(-5);
        expect(bounds?.yMax).toEqual(40);
    }
})