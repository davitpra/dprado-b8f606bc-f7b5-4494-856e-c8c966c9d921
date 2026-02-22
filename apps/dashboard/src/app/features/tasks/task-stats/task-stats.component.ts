import {
  Component, ChangeDetectionStrategy, inject,
  computed, effect, ViewChild, ElementRef, OnDestroy,
} from '@angular/core';
import { Chart, ArcElement, DoughnutController, Tooltip } from 'chart.js';
import { TaskStatus } from '@task-management/data';
import { TaskStore } from '../../../core/stores/task.store';
import { DepartmentStore } from '../../../core/stores/department.store';
import { UIStore } from '../../../core/stores/ui.store';

Chart.register(ArcElement, DoughnutController, Tooltip);

@Component({
  selector: 'app-task-stats',
  standalone: true,
  imports: [],
  templateUrl: './task-stats.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskStatsComponent implements OnDestroy {
  @ViewChild('chartCanvas') chartCanvas?: ElementRef<HTMLCanvasElement>;

  private taskStore = inject(TaskStore);
  private departmentStore = inject(DepartmentStore);
  private uiStore = inject(UIStore);
  private chart: Chart<'doughnut'> | null = null;

  protected stats = computed(() => {
    const tasks = this.taskStore.tasks();
    const todo       = tasks.filter(t => t.status === TaskStatus.TODO).length;
    const inProgress = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    const done       = tasks.filter(t => t.status === TaskStatus.DONE).length;
    const total      = tasks.length;
    const pct        = total > 0 ? Math.round((done / total) * 100) : 0;
    return { todo, inProgress, done, total, pct };
  });

  protected deptLabel = computed(() =>
    this.departmentStore.currentDepartment()?.name ?? 'All Departments',
  );

  constructor() {
    effect(() => {
      const { todo, inProgress, done } = this.stats();
      const isDark = this.uiStore.isDarkMode();
      this.renderChart([todo, inProgress, done], isDark);
    });
  }

  private colors(isDark: boolean) {
    return {
      todo:       isDark ? 'rgba(156,163,175,0.85)' : 'rgba(156,163,175,1)',  // gray-400
      inProgress: isDark ? 'rgba(96,165,250,0.85)'  : 'rgba(59,130,246,1)',   // blue-400/500
      done:       isDark ? 'rgba(52,211,153,0.85)'  : 'rgba(16,185,129,1)',   // emerald-400/500
      border:     isDark ? '#1f2937' : '#ffffff',                              // card bg
    };
  }

  private renderChart(data: number[], isDark: boolean): void {
    const canvas = this.chartCanvas?.nativeElement;
    if (!canvas) {
      this.chart?.destroy();
      this.chart = null;
      return;
    }
    const c = this.colors(isDark);
    const bg     = [c.todo, c.inProgress, c.done];
    const border = c.border;

    if (this.chart) {
      this.chart.data.datasets[0].data = data;
      (this.chart.data.datasets[0] as any).backgroundColor = bg;
      (this.chart.data.datasets[0] as any).borderColor = border;
      this.chart.update();
      return;
    }
    this.chart = new Chart(canvas.getContext('2d')!, {
      type: 'doughnut',
      data: {
        labels: ['Todo', 'In Progress', 'Done'],
        datasets: [{ data, backgroundColor: bg, borderColor: border, borderWidth: 2, hoverOffset: 4 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}` } },
        },
        animation: { duration: 400 },
      },
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
