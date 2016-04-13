describe('Popper.js', function() {
    // define modules paths
    require.config({
        paths: {
            popper: 'base/src/popper'
        }
    });

    var TestPopper;

    it('loads the AMD module', function(done) {
        require(['popper'], function(Popper) {
            TestPopper = Popper;
            expect(Popper).toBeDefined();
            done();
        });
    });

    it('can access the AMD module to create a new instance', function() {
        // append popper element
        var popper = document.createElement('div');
        popper.style.width = '100px';
        popper.style.height = '100px';
        jasmineWrapper.appendChild(popper);

        // append trigger element
        var trigger = document.createElement('div');
        jasmineWrapper.appendChild(trigger);

        // initialize new popper instance
        var pop = new TestPopper(trigger, popper);

        expect(pop).toBeDefined();
    });

    it('inits a bottom popper', function() {
        var reference = appendNewRef(1);
        var popper    = appendNewPopper(2);

        var pop = new TestPopper(reference, popper);

        var top = popper.getBoundingClientRect().top;
        expect(top).toBeApprox(51);

        pop.destroy();
    });

    it('inits a right popper', function() {
        var reference = appendNewRef(1);
        var popper    = appendNewPopper(2);

        var pop = new TestPopper(reference, popper, {
            placement: 'right'
        });

        var left    = popper.getBoundingClientRect().left;
        var local   = 92;
        var ci      = 110;
        expect([local, ci]).toContain(left);

        pop.destroy();
    });

    it('inits a popper inside a scrolling div, contained in a relative div', function() {
        var relative = document.createElement('div');
        relative.style.height = '800px';
        relative.style.width = '800px';
        jasmineWrapper.appendChild(relative);

        var scrolling = document.createElement('div');
        scrolling.style.width = '800px';
        scrolling.style.height = '800px';
        scrolling.style.overflow = 'auto';
        relative.appendChild(scrolling);

        var superHigh = document.createElement('div');
        superHigh.style.width = '800px';
        superHigh.style.height = '1600px';
        scrolling.appendChild(superHigh);

        var ref = appendNewRef(1, 'ref', superHigh);
        var popper = appendNewPopper(2, 'popper', superHigh);


        scrolling.scrollTop = 500;
        var pop = new TestPopper(ref, popper);

        var top     = popper.getBoundingClientRect().top;
        expect(top).toBeApprox(-449);
        pop.destroy();

    });

    it('inits a popper inside a body, with its reference element inside a relative div', function() {
        var relative = document.createElement('div');
        relative.style.position = 'relative';
        relative.style.margin = '20px';
        jasmineWrapper.appendChild(relative);

        var ref = appendNewRef(1, 'ref', relative);
        var popper = appendNewPopper(2, 'popper');

        new TestPopper(ref, popper).onCreate(function(pop) {
            expect(popper.getBoundingClientRect().top).toBeApprox(63);
            expect(popper.getBoundingClientRect().left).toBeApprox(5);
            pop.destroy();
        });

    });

    it('inits a popper inside a scrolled body, with its reference element inside a relative div', function() {
        var relative = document.createElement('div');
        relative.style.position = 'relative';
        relative.style.margin = '20px';
        relative.style.height = '300vh';
        jasmineWrapper.appendChild(relative);
        document.body.scrollTop = 800;

        var ref = appendNewRef(1, 'ref', relative);
        ref.style.marginTop = '200px';
        var popper = appendNewPopper(2, 'popper');

        new TestPopper(ref, popper).onCreate(function(pop) {
            expect(popper.getBoundingClientRect().top).toBeApprox(-800 + 263);
            expect(popper.getBoundingClientRect().left).toBeApprox(5);
            pop.destroy();
        });
    });

    it('inits a popper inside a scrolled body, with its reference element inside a scrolling div, wrapped in a relative div', function() {
        var relative = document.createElement('div');
        relative.style.position = 'relative';
        relative.style.margin = '20px';
        relative.style.height = '200vh';
        jasmineWrapper.appendChild(relative);
        document.body.scrollTop = 800;

        var scrolling = document.createElement('div');
        scrolling.style.width = '800px';
        scrolling.style.height = '800px';
        scrolling.style.overflow = 'auto';
        relative.appendChild(scrolling);

        var superHigh = document.createElement('div');
        superHigh.style.width = '800px';
        superHigh.style.height = '1600px';
        scrolling.appendChild(superHigh);

        scrolling.scrollTop = 500;

        var ref = appendNewRef(1, 'ref', scrolling);
        ref.style.marginTop = '200px';
        var popper = appendNewPopper(2, 'popper');

        new TestPopper(ref, popper).onCreate(function(pop) {
            // force redraw
            window.dispatchEvent(new Event('resize'));

            expect(popper.getBoundingClientRect().top).toBeApprox(ref.getBoundingClientRect().bottom + 5);
            expect(popper.getBoundingClientRect().left).toBeApprox(5);
            pop.destroy();
        });
    });

    it('inits a popper near a reference element, both inside a fixed element, inside a scrolled body', function(done) {
        var fixed = document.createElement('div');
        fixed.style.position = 'fixed';
        fixed.style.margin = '20px';
        fixed.style.height = '50px';
        fixed.style.width = '100%';
        jasmineWrapper.appendChild(fixed);

        var relative = document.createElement('div');
        relative.style.position = 'relative';
        relative.style.margin = '20px';
        relative.style.height = '200vh';
        jasmineWrapper.appendChild(relative);
        document.body.scrollTop = 800;

        var ref = appendNewRef(1, 'ref', fixed);
        var popper = appendNewPopper(2, 'popper', fixed);

        new TestPopper(ref, popper).onCreate(function(pop) {
            // force redraw
            window.dispatchEvent(new Event('resize'));

            expect(popper.getBoundingClientRect().top).toBeApprox(83);
            expect(popper.getBoundingClientRect().left).toBeApprox(5);
            pop.destroy();
            done();
        });
    });

    it('inits a popper near a reference element, both inside a fixed element on bottom of viewport, inside a scrolled body', function(done) {
        var fixed = document.createElement('div');
        fixed.style.position = 'fixed';
        fixed.style.bottom = '0';
        fixed.style.height = '38px';
        fixed.style.width = '100%';
        jasmineWrapper.appendChild(fixed);

        var relative = document.createElement('div');
        relative.style.position = 'relative';
        relative.style.margin = '20px';
        relative.style.height = '200vh';
        jasmineWrapper.appendChild(relative);
        document.body.scrollTop = 800;

        var ref = appendNewRef(1, 'ref', fixed);
        var popper = appendNewPopper(2, 'popper', fixed);

        new TestPopper(ref, popper, { placement: 'top' }).onCreate(function(pop) {
            // force redraw
            window.dispatchEvent(new Event('resize'));

            var local = 729;
            var ci = 739;
            expect([local, ci]).toContain(popper.getBoundingClientRect().top);
            expect(popper.getBoundingClientRect().left).toBeApprox(5);
            expect(popper.getAttribute('x-placement')).toBe('top');
            pop.destroy();
            done();
        });
    });

    it('inits a popper and destroy it using its callback', function(done) {
        var reference = appendNewRef(1);
        var popper    = appendNewPopper(2);

        new TestPopper(reference, popper).onCreate(function(pop) {
            pop.destroy();
            expect(popper.style.top).toBe('');
            done();
        });
    });

    it('creates a popper using the default configuration', function(done) {
        var reference = appendNewRef(1);

        new TestPopper(reference).onCreate(function(instance) {
            expect(document.querySelectorAll('.popper').length).toBe(1);
            document.body.removeChild(instance._popper);
            done();
        });
    });

    it('creates a popper using a custom configuration', function(done) {
        var reference = appendNewRef(1);

        new TestPopper(reference, {
            content: 'something'
        }).onCreate(function(instance) {
            expect(instance._popper.innerText).toBe('something');
            document.body.removeChild(instance._popper);
            done();
        });
    });

    it('creates a popper and sets an onUpdate callback', function(done) {
        var reference = appendNewRef(1);

        new TestPopper(reference, {content: 'react'}, {
            modifiersIgnored: ['applyStyle']
        }).onUpdate(function(data) {
            expect(data.offsets.popper.top).toBeApprox(46);
            done();
        });
    });

    it('creates a popper when content is undefined', function(done) {
        var reference = appendNewRef(1);

        new TestPopper(reference).onCreate(function(instance) {
            expect(instance._popper).toBeDefined();
            expect(instance._popper.innerText).toBe('');
            document.body.removeChild(instance._popper);
            done();
        });
    });

    // EXPERIMENTAL
    it('inits a popper inside a scrolled body, with its reference element inside a scrolling div, wrapped in a relative div', function() {
        var relative = document.createElement('div');
        relative.style.position = 'relative';
        relative.style.margin = '20px';
        relative.style.height = '200vh';
        relative.style.paddingTop = '100px';
        relative.style.backgroundColor = 'yellow';
        jasmineWrapper.appendChild(relative);
        document.body.scrollTop = 100;

        var scrolling = document.createElement('div');
        scrolling.style.width = '100%';
        scrolling.style.height = '100vh';
        scrolling.style.overflow = 'auto';
        scrolling.style.backgroundColor = 'green';
        relative.appendChild(scrolling);

        var superHigh = document.createElement('div');
        superHigh.style.width = '1px';
        superHigh.style.float = 'right';
        superHigh.style.height = '300vh';
        scrolling.appendChild(superHigh);

        scrolling.scrollTop = 100;

        var ref = appendNewRef(1, 'ref', scrolling);
        ref.style.width = '100px';
        ref.style.height = '100px';
        ref.style.marginTop = '100px';
        var popper = appendNewPopper(2, 'popper', scrolling);

        new TestPopper(ref, popper, { placement: 'right'}).onCreate(function(pop) {
            // force redraw
            window.dispatchEvent(new Event('resize'));

            expect(popper.getBoundingClientRect().top).toBeApprox(ref.getBoundingClientRect().bottom + 5);
            expect(popper.getBoundingClientRect().left).toBeApprox(5);
            pop.destroy();
        });
    });
});
