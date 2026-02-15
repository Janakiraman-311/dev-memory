/**
 * Dev Memory - Force Directed Graph Visualizer
 * A lightweight, dependency-free graph renderer using HTML5 Canvas.
 */

class GraphVisualizer {
    constructor(canvasId, containerId) {
        this.canvas = document.getElementById(canvasId);
        this.container = document.getElementById(containerId);
        this.ctx = this.canvas.getContext('2d');

        // State
        this.nodes = [];
        this.links = [];
        this.transform = { x: 0, y: 0, k: 1 }; // Pan/Zoom state
        this.isDragging = false;
        this.dragNode = null;
        this.hoverNode = null;
        this.animationId = null;
        this.lastTime = 0;

        // Physics Constants
        this.REPULSION = 2000;
        this.SPRING_LENGTH = 150;
        this.SPRING_STRENGTH = 0.05;
        this.DAMPING = 0.85; // Slow down
        this.CENTER_GRAVITY = 0.01;

        // Interaction State
        this.dragStart = { x: 0, y: 0 };
        this.mouse = { x: 0, y: 0 };

        this.resize();
        this.setupEvents();

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        // Handle High DPI
        const dpr = window.devicePixelRatio || 1;
        const rect = this.container.getBoundingClientRect();

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;

        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;

        // Center initial view
        this.transform.x = this.width / 2;
        this.transform.y = this.height / 2;
    }

    /**
     * Load conversations and build graph (Tree/Cluster Layout with Cross-Links)
     */
    setData(conversations) {
        // 1. Create Nodes
        const rootNode = {
            id: 'ROOT',
            title: 'My Memory',
            type: 'root',
            radius: 30,
            x: 0,
            y: 0,
            vx: 0, vy: 0, fx: 0, fy: 0
        };

        this.nodes = [rootNode];
        this.links = [];

        // Group by Tag (Pick the first tag for grouping)
        const groups = new Map();

        conversations.forEach(c => {
            const tag = (c.tags && c.tags.length > 0) ? c.tags[0] : 'Uncategorized';
            if (!groups.has(tag)) groups.set(tag, []);
            groups.get(tag).push(c);
        });

        // Create Category Nodes and Links to Root
        let catIndex = 0;
        const totalCats = groups.size;

        groups.forEach((convs, tag) => {
            // Category Node (Distributed in circle)
            const angle = (catIndex / totalCats) * Math.PI * 2;
            const catX = Math.cos(angle) * 200;
            const catY = Math.sin(angle) * 200;

            const catNode = {
                id: `CAT-${tag}`,
                title: tag,
                type: 'category',
                radius: 15 + Math.min(10, convs.length),
                x: catX,
                y: catY,
                vx: 0, vy: 0, fx: 0, fy: 0
            };
            this.nodes.push(catNode);

            // Link Root -> Category
            this.links.push({
                source: 0,
                target: this.nodes.length - 1,
                type: 'root'
            });

            // Create Conversation Nodes
            convs.forEach(c => {
                const leafAngle = angle + (Math.random() - 0.5) * 0.8; // Spread around category
                const leafX = catX + Math.cos(leafAngle) * 100;
                const leafY = catY + Math.sin(leafAngle) * 100;

                const leafNode = {
                    id: c.conversationId,
                    title: c.title || 'Untitled',
                    platform: c.platform,
                    type: 'leaf',
                    radius: Math.max(6, Math.min(12, 4 + Math.sqrt(c.messageCount || 0))),
                    x: leafX,
                    y: leafY,
                    vx: 0, vy: 0, fx: 0, fy: 0,
                    messageCount: c.messageCount || 0,
                    tags: c.tags || [] // Keep all tags for cross-linking
                };
                this.nodes.push(leafNode);

                // Link Category -> Leaf
                this.links.push({
                    source: this.nodes.indexOf(catNode),
                    target: this.nodes.length - 1,
                    type: 'leaf'
                });
            });

            catIndex++;
        });

        // 3. Create Cross-Links (Knowledge Graph)
        // Check if any two leaf nodes share a tag (other than their primary group tag)
        // Limit: Only link if sharing secondary tags to avoid clutter
        const leafNodes = this.nodes.filter(n => n.type === 'leaf');

        for (let i = 0; i < leafNodes.length; i++) {
            for (let j = i + 1; j < leafNodes.length; j++) {
                const nodeA = leafNodes[i];
                const nodeB = leafNodes[j];

                // Find shared tags
                const sharedTags = nodeA.tags.filter(t => nodeB.tags.includes(t));

                // If they share more than 0 tags (and are likely in different clusters or same cluster with multiple tags)
                // Actually, if in same cluster, they share primary tag. We might ignore primary tag?
                // But linking within cluster is fine too.
                // Let's link if they share ANY tag.
                if (sharedTags.length > 0) {
                    // Check if already linked directly (via category)? No, leaves don't link directly usually.
                    // Add weak cross-link
                    this.links.push({
                        source: this.nodes.indexOf(nodeA),
                        target: this.nodes.indexOf(nodeB),
                        type: 'cross',
                        tags: sharedTags
                    });
                }
            }
        }

        console.log(`[Graph] Built Tree: ${this.nodes.length} nodes, ${this.links.length} links`);
        this.start();
    }

    start() {
        if (!this.animationId) {
            this.lastTime = performance.now();
            this.animate();
        }
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    animate(time) {
        if (!time) time = performance.now();
        const dt = Math.min((time - this.lastTime) / 1000, 0.1); // Cap dt
        this.lastTime = time;

        this.updatePhysics();
        this.draw();

        this.animationId = requestAnimationFrame((t) => this.animate(t));
    }

    updatePhysics() {
        // Reset forces
        this.nodes.forEach(node => {
            node.fx = 0;
            node.fy = 0;
        });

        // 1. Repulsion (Push apart)
        // Root repels everyone strongly? No, Root is fixed.
        // Categories repel Categories strongly.
        // Leaves repel Leaves weakly.

        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const a = this.nodes[i];
                const b = this.nodes[j];

                // Determine repulsion strength based on types
                let strength = this.REPULSION;
                if (a.type === 'category' && b.type === 'category') strength *= 3; // Keep categories apart
                if (a.type === 'leaf' && b.type === 'leaf') strength *= 0.5; // Leaves can crowd

                let dx = a.x - b.x;
                let dy = a.y - b.y;
                let distSq = dx * dx + dy * dy;
                if (distSq < 100) distSq = 100; // prevent huge forces

                const force = strength / distSq;
                const dist = Math.sqrt(distSq);
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;

                if (a.type !== 'root') { a.fx += fx; a.fy += fy; }
                if (b.type !== 'root') { b.fx -= fx; b.fy -= fy; }
            }
        }

        // 2. Spring Attraction (Pull to parent)
        this.links.forEach(link => {
            const a = this.nodes[link.source];
            const b = this.nodes[link.target];

            if (!a || !b) return; // Safety

            let length = 100;
            let strength = 0.05;

            if (link.type === 'root') { length = 150; strength = 0.1; }
            else if (link.type === 'leaf') { length = 80; strength = 0.08; }
            else if (link.type === 'cross') { length = 200; strength = 0.005; } // Very weak, long cross links

            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist === 0) return;

            const force = (dist - length) * strength;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (a.type !== 'root') { a.fx -= fx; a.fy -= fy; }
            if (b.type !== 'root') { b.fx += fx; b.fy += fy; }
        });

        // 3. Center Gravity (Weak pull to 0,0 for drift)
        this.nodes.forEach(node => {
            if (node.type !== 'root') {
                node.fx -= node.x * (this.CENTER_GRAVITY * 0.5);
                node.fy -= node.y * (this.CENTER_GRAVITY * 0.5);
            }
        });

        // 4. Update
        this.nodes.forEach(node => {
            if (node.type === 'root' || node === this.dragNode) return;

            node.vx = (node.vx + node.fx) * this.DAMPING;
            node.vy = (node.vy + node.fy) * this.DAMPING;
            node.x += node.vx;
            node.y += node.vy;
        });
    }

    draw() {
        const ctx = this.ctx;

        // Background Gradient
        const gradient = ctx.createRadialGradient(
            this.width / 2, this.height / 2, 0,
            this.width / 2, this.height / 2, this.width
        );
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.save();
        ctx.translate(this.transform.x, this.transform.y);
        ctx.scale(this.transform.k, this.transform.k);

        // Draw Links
        this.links.forEach(link => {
            const a = this.nodes[link.source];
            const b = this.nodes[link.target];
            if (!a || !b) return;

            ctx.beginPath();

            if (link.type === 'root') {
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx.lineWidth = 2;
                ctx.setLineDash([]);
            } else if (link.type === 'leaf') {
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.lineWidth = 1;
                ctx.setLineDash([]);
            } else if (link.type === 'cross') {
                // Dashed line for cross links
                ctx.strokeStyle = 'rgba(100, 200, 255, 0.15)';
                ctx.lineWidth = 0.5;
                ctx.setLineDash([5, 5]);
            }

            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.setLineDash([]); // Reset dash for next link
        });
        ctx.setLineDash([]); // Reset dash after all links

        // Draw Nodes
        this.nodes.forEach(node => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

            // Refined Colors
            if (node.type === 'root') {
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = 'rgba(255,255,255,0.8)';
                ctx.shadowBlur = 15;
            } else if (node.type === 'category') {
                ctx.fillStyle = '#9f7aea';
                ctx.shadowColor = 'rgba(159, 122, 234, 0.6)';
                ctx.shadowBlur = 10;
            } else if (node.platform === 'claude.ai') {
                ctx.fillStyle = '#ff7b54';
                ctx.shadowColor = 'rgba(255, 123, 84, 0.5)';
                ctx.shadowBlur = 8;
            } else if (node.platform === 'chatgpt.com') {
                ctx.fillStyle = '#74aa9c';
                ctx.shadowColor = 'rgba(116, 170, 156, 0.5)';
                ctx.shadowBlur = 8;
            } else {
                ctx.fillStyle = '#667eea';
                ctx.shadowColor = 'rgba(102, 126, 234, 0.5)';
                ctx.shadowBlur = 8;
            }

            if (node === this.hoverNode) {
                ctx.fillStyle = '#fff';
                ctx.shadowColor = 'white';
                ctx.shadowBlur = 15;
            }

            if (node.type !== 'root' && node.type !== 'category' && node !== this.hoverNode) {
                ctx.shadowBlur = 0;
            }

            ctx.fill();

            // Labels
            if (node.type === 'root' || node.type === 'category' || node === this.hoverNode || this.transform.k > 1.5) {
                ctx.fillStyle = '#fff';
                ctx.font = node.type === 'root' ? 'bold 16px Inter, sans-serif' : (node.type === 'category' ? 'bold 12px Inter, sans-serif' : '10px Inter, sans-serif');
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Text Shadow for readability
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 4;
                ctx.fillText(node.title.substring(0, 25), node.x, node.y + node.radius + 14);
                ctx.shadowBlur = 0;
            }
        });

        ctx.restore();
    }

    // Interaction Helpers
    screenToWorld(x, y) {
        return {
            x: (x - this.transform.x) / this.transform.k,
            y: (y - this.transform.y) / this.transform.k
        };
    }

    getNodeAt(x, y) {
        const worldPos = this.screenToWorld(x, y);
        // Find closest node within radius
        // Reverse iterate to find top-most
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const node = this.nodes[i];
            const dx = worldPos.x - node.x;
            const dy = worldPos.y - node.y;
            if (dx * dx + dy * dy < node.radius * node.radius) {
                return node;
            }
        }
        return null;
    }

    setupEvents() {
        const canvas = this.canvas;
        const tooltip = document.getElementById('graphTooltip');

        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            this.dragNode = this.getNodeAt(x, y);

            if (this.dragNode) {
                this.isDragging = true;
                this.dragNode.vx = 0;
                this.dragNode.vy = 0;
            } else {
                this.isPanning = true;
                this.dragStart = { x: x, y: y };
                canvas.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Hover Logic
            const prevHover = this.hoverNode;
            this.hoverNode = this.getNodeAt(x, y);

            if (this.hoverNode !== prevHover) {
                canvas.style.cursor = this.hoverNode ? 'pointer' : (this.isPanning ? 'grabbing' : 'grab');

                // Show/Hide Tooltip
                if (this.hoverNode) {
                    tooltip.innerHTML = `<strong>${this.hoverNode.title}</strong><br>${this.hoverNode.tags?.join(', ') || 'No tags'}`;
                    tooltip.style.left = `${e.clientX + 10}px`;
                    tooltip.style.top = `${e.clientY + 10}px`;
                    tooltip.classList.remove('hidden');
                } else {
                    tooltip.classList.add('hidden');
                }
            }

            // Move Tooltip if visible
            if (this.hoverNode) {
                tooltip.style.left = `${e.clientX + 10}px`;
                tooltip.style.top = `${e.clientY + 10}px`;
            }

            // Drag Logic
            if (this.isDragging && this.dragNode) {
                const worldPos = this.screenToWorld(x, y);
                this.dragNode.x = worldPos.x;
                this.dragNode.y = worldPos.y;
            }

            // Pan Logic
            if (this.isPanning) {
                const dx = x - this.dragStart.x;
                const dy = y - this.dragStart.y;
                this.transform.x += dx;
                this.transform.y += dy;
                this.dragStart = { x, y };
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.isPanning = false;
            this.dragNode = null;
            canvas.style.cursor = 'grab';
        });

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const zoomSensitivity = 0.001;
            const delta = -e.deltaY * zoomSensitivity;
            const scaleFactor = 1 + delta;

            // Zoom around pointer
            const worldPos = this.screenToWorld(x, y);

            // New scale
            let newK = this.transform.k * scaleFactor;
            newK = Math.max(0.1, Math.min(5, newK)); // Clamp zoom

            // Adjust translate to keep pointer fixed
            // worldPos.x * newK + newTx = x
            // newTx = x - worldPos.x * newK
            this.transform.x = x - worldPos.x * newK;
            this.transform.y = y - worldPos.y * newK;
            this.transform.k = newK;
        });

        // Click to Open
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const node = this.getNodeAt(x, y);

            // Only if roughly same position as mousedown (not a drag)
            if (node && !this.isPanning) {
                if (window.handleGraphNodeClick) {
                    window.handleGraphNodeClick(node.id);
                }
            }
        });

        // Control Buttons
        document.getElementById('zoomInBtn').addEventListener('click', () => {
            this.transform.k *= 1.2;
            this.resize(); // Just to center/update? No, keeping center zoom simple for now
        });
        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            this.transform.k /= 1.2;
        });
        document.getElementById('resetGraphBtn').addEventListener('click', () => {
            this.transform = { x: this.width / 2, y: this.height / 2, k: 1 };
        });
    }
}
