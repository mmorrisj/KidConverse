#!/usr/bin/env python3
"""
CLI for SOL Processing Pipeline
Provides commands for processing SOL documents with the two-stage pipeline
"""

import sys
import json
from pathlib import Path
from typing import Optional
import click
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.panel import Panel
from rich import print as rprint

from sol_pipeline import SOLPipeline, ProcessingResult

console = Console()


@click.group()
@click.version_option(version="1.0.0")
def cli():
    """
    SOL Processing Pipeline CLI

    Two-stage pipeline for processing Virginia Standards of Learning documents:
    - Stage 1: Detection - Identify SOL content
    - Stage 2: Transformation - Convert to standards.json format
    """
    pass


@cli.command()
@click.argument('file_path', type=click.Path(exists=True))
@click.option('--subject', '-s', help='Force subject (e.g., mathematics, science)')
@click.option('--grade', '-g', help='Force grade level (e.g., 3, K, Algebra 1)')
@click.option('--output-dir', '-o', default='./sol_staging', help='Output directory for staged files')
@click.option('--detect-only', is_flag=True, help='Run detection stage only, no transformation')
def process(
    file_path: str,
    subject: Optional[str],
    grade: Optional[str],
    output_dir: str,
    detect_only: bool
):
    """
    Process a single SOL document file

    Supports .docx, .xlsx, .py, and .json formats.

    Example:
        sol_pipeline_cli.py process SOL/Documentation/3-2023-Approved-Math-SOL.docx

        sol_pipeline_cli.py process SOL/3_MATH_SOL.py

        sol_pipeline_cli.py process myfile.xlsx --subject mathematics --grade 3
    """
    console.print("\n[bold cyan]SOL Document Processing Pipeline[/bold cyan]\n")

    try:
        pipeline = SOLPipeline(staging_dir=output_dir)

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:

            task = progress.add_task("Processing document...", total=None)

            if detect_only:
                # Detection only mode
                file_path_obj = Path(file_path)
                document_text = pipeline.extract_document_text(file_path)
                detection_result = pipeline.detect_sol_content(document_text, file_path_obj.name)

                progress.update(task, completed=True)

                # Display detection results
                console.print("\n[bold green]Detection Results:[/bold green]\n")

                result_table = Table(show_header=False, box=None)
                result_table.add_column("Field", style="cyan")
                result_table.add_column("Value", style="yellow")

                result_table.add_row("Has SOL Content", "✓ Yes" if detection_result.has_sol_content else "✗ No")
                result_table.add_row("Confidence", detection_result.confidence)
                result_table.add_row("Subject", detection_result.detected_subject or "N/A")
                result_table.add_row("Grade", detection_result.detected_grade or "N/A")
                result_table.add_row("Standards Count", str(detection_result.detected_standards_count))
                result_table.add_row("Reasoning", detection_result.reasoning)

                console.print(result_table)

                if detection_result.has_sol_content:
                    console.print("\n[bold green]✓ SOL content detected![/bold green]")
                else:
                    console.print("\n[bold red]✗ No SOL content detected[/bold red]")
                    sys.exit(1)

            else:
                # Full pipeline
                result = pipeline.process_file(
                    file_path,
                    skip_detection=(subject is not None and grade is not None),
                    force_subject=subject,
                    force_grade=grade
                )

                progress.update(task, completed=True)

                if result.success:
                    # Success panel
                    console.print(Panel(
                        f"[green]✓ Processing successful![/green]\n\n"
                        f"Standards extracted: [cyan]{result.standards_extracted}[/cyan]\n"
                        f"Output file: [yellow]{result.output_file}[/yellow]\n\n"
                        f"Subject: [cyan]{result.detection_result.detected_subject}[/cyan]\n"
                        f"Grade: [cyan]{result.detection_result.detected_grade}[/cyan]",
                        title="Success",
                        border_style="green"
                    ))
                else:
                    # Error panel
                    console.print(Panel(
                        f"[red]✗ Processing failed[/red]\n\n"
                        f"Error: {result.error}",
                        title="Error",
                        border_style="red"
                    ))
                    sys.exit(1)

    except Exception as e:
        console.print(f"\n[bold red]Error:[/bold red] {e}\n")
        sys.exit(1)


@cli.command()
@click.argument('directory_path', type=click.Path(exists=True))
@click.option('--pattern', '-p', multiple=True, help='File patterns to match (default: auto-detect all supported files)')
@click.option('--output-dir', '-o', default='./sol_staging', help='Output directory for staged files')
@click.option('--skip-detection', is_flag=True, help='Skip detection stage (not recommended)')
def batch(
    directory_path: str,
    pattern: tuple,
    output_dir: str,
    skip_detection: bool
):
    """
    Process all SOL documents in a directory

    Automatically processes all .docx, .xlsx, .py, and .json files unless patterns specified.

    Example:
        sol_pipeline_cli.py batch SOL/

        sol_pipeline_cli.py batch SOL/Documentation/ --pattern "*.docx" --pattern "*Math*"
    """
    console.print("\n[bold cyan]SOL Batch Processing Pipeline[/bold cyan]\n")

    patterns = list(pattern) if pattern else None

    try:
        pipeline = SOLPipeline(staging_dir=output_dir)

        results = pipeline.process_directory(
            directory_path,
            patterns=patterns,
            skip_detection=skip_detection
        )

        # Summary table
        console.print("\n[bold green]Processing Summary:[/bold green]\n")

        summary_table = Table(show_header=True)
        summary_table.add_column("File", style="cyan")
        summary_table.add_column("Status", style="yellow")
        summary_table.add_column("Standards", justify="right", style="green")
        summary_table.add_column("Subject", style="magenta")
        summary_table.add_column("Grade", style="blue")

        for result in results:
            file_name = Path(result.source_file).name
            status = "✓ Success" if result.success else "✗ Failed"
            standards = str(result.standards_extracted) if result.success else "-"
            subject = result.detection_result.detected_subject if result.detection_result else "-"
            grade = result.detection_result.detected_grade if result.detection_result else "-"

            summary_table.add_row(file_name, status, standards, subject, grade)

        console.print(summary_table)

        # Final stats
        successful = sum(1 for r in results if r.success)
        total_standards = sum(r.standards_extracted for r in results if r.success)

        console.print(Panel(
            f"Total files: [cyan]{len(results)}[/cyan]\n"
            f"Successful: [green]{successful}[/green]\n"
            f"Failed: [red]{len(results) - successful}[/red]\n"
            f"Total standards: [yellow]{total_standards}[/yellow]\n"
            f"Output directory: [blue]{output_dir}[/blue]",
            title="Batch Summary",
            border_style="cyan"
        ))

    except Exception as e:
        console.print(f"\n[bold red]Error:[/bold red] {e}\n")
        sys.exit(1)


@cli.command()
@click.argument('staging_dir', type=click.Path(exists=True), default='./sol_staging')
def list_staged(staging_dir: str):
    """
    List all staged standards.json files

    Example:
        sol_pipeline_cli.py list-staged

        sol_pipeline_cli.py list-staged ./my_staging_dir
    """
    staging_path = Path(staging_dir)
    json_files = list(staging_path.glob("*_standards.json"))

    if not json_files:
        console.print(f"\n[yellow]No staged files found in {staging_dir}[/yellow]\n")
        return

    console.print(f"\n[bold cyan]Staged Standards Files[/bold cyan] ({len(json_files)} files)\n")

    table = Table(show_header=True)
    table.add_column("File", style="cyan")
    table.add_column("Size", justify="right", style="yellow")
    table.add_column("Standards", justify="right", style="green")
    table.add_column("Subjects", style="magenta")
    table.add_column("Grades", style="blue")

    for json_file in sorted(json_files):
        try:
            with open(json_file, 'r') as f:
                data = json.load(f)

            # Count standards and get metadata
            total_standards = 0
            subjects = set()
            grades = set()

            for subject, grade_data in data.items():
                subjects.add(subject)
                for grade, standards in grade_data.items():
                    grades.add(grade)
                    total_standards += len(standards)

            size_kb = json_file.stat().st_size / 1024

            table.add_row(
                json_file.name,
                f"{size_kb:.1f} KB",
                str(total_standards),
                ", ".join(sorted(subjects)),
                ", ".join(sorted(grades))
            )

        except Exception as e:
            table.add_row(json_file.name, "Error", "-", "-", "-")

    console.print(table)
    console.print()


@cli.command()
@click.argument('staged_file', type=click.Path(exists=True))
def validate(staged_file: str):
    """
    Validate a staged standards.json file

    Checks that the file matches the expected format.

    Example:
        sol_pipeline_cli.py validate sol_staging/math_grade3_standards.json
    """
    console.print(f"\n[bold cyan]Validating:[/bold cyan] {staged_file}\n")

    try:
        with open(staged_file, 'r') as f:
            data = json.load(f)

        errors = []
        warnings = []

        # Check top-level structure
        if not isinstance(data, dict):
            errors.append("Root element must be a dictionary")
        else:
            # Validate each subject
            for subject, grade_data in data.items():
                if not isinstance(grade_data, dict):
                    errors.append(f"Subject '{subject}' must contain a dictionary of grades")
                    continue

                # Validate each grade
                for grade, standards in grade_data.items():
                    if not isinstance(standards, dict):
                        errors.append(f"Grade '{grade}' in subject '{subject}' must contain a dictionary of standards")
                        continue

                    # Validate each standard
                    for std_code, std_data in standards.items():
                        if not isinstance(std_data, dict):
                            errors.append(f"Standard '{std_code}' must be a dictionary")
                            continue

                        # Check required fields
                        if 'title' not in std_data:
                            warnings.append(f"Standard '{std_code}' missing 'title' field")
                        if 'description' not in std_data:
                            errors.append(f"Standard '{std_code}' missing 'description' field")
                        if 'strands' not in std_data:
                            warnings.append(f"Standard '{std_code}' missing 'strands' field")
                        elif not isinstance(std_data['strands'], list):
                            errors.append(f"Standard '{std_code}' 'strands' must be an array")

        # Display results
        if errors:
            console.print("[bold red]Validation Errors:[/bold red]")
            for error in errors:
                console.print(f"  [red]✗[/red] {error}")

        if warnings:
            console.print("\n[bold yellow]Warnings:[/bold yellow]")
            for warning in warnings:
                console.print(f"  [yellow]⚠[/yellow] {warning}")

        if not errors and not warnings:
            console.print("[bold green]✓ Validation successful![/bold green]")

            # Show summary
            total_standards = sum(
                len(standards)
                for subject_data in data.values()
                for standards in subject_data.values()
            )

            console.print(f"\nTotal standards: [cyan]{total_standards}[/cyan]")
        elif errors:
            console.print(f"\n[bold red]Validation failed with {len(errors)} errors[/bold red]")
            sys.exit(1)
        else:
            console.print(f"\n[bold yellow]Validation passed with {len(warnings)} warnings[/bold yellow]")

        console.print()

    except json.JSONDecodeError as e:
        console.print(f"[bold red]Invalid JSON:[/bold red] {e}\n")
        sys.exit(1)
    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {e}\n")
        sys.exit(1)


@cli.command()
@click.argument('staging_dir', type=click.Path(exists=True), default='./sol_staging')
@click.argument('output_file', type=click.Path())
def merge(staging_dir: str, output_file: str):
    """
    Merge all staged standards.json files into one

    Combines multiple staged files into a single standards.json file.

    Example:
        sol_pipeline_cli.py merge ./sol_staging merged_standards.json
    """
    staging_path = Path(staging_dir)
    json_files = list(staging_path.glob("*_standards.json"))

    if not json_files:
        console.print(f"\n[yellow]No staged files found in {staging_dir}[/yellow]\n")
        return

    console.print(f"\n[bold cyan]Merging {len(json_files)} staged files...[/bold cyan]\n")

    merged_data = {}

    for json_file in json_files:
        console.print(f"Reading: [cyan]{json_file.name}[/cyan]")

        try:
            with open(json_file, 'r') as f:
                data = json.load(f)

            # Merge into combined data
            for subject, grade_data in data.items():
                if subject not in merged_data:
                    merged_data[subject] = {}

                for grade, standards in grade_data.items():
                    if grade not in merged_data[subject]:
                        merged_data[subject][grade] = {}

                    # Merge standards (later files overwrite earlier ones for duplicates)
                    merged_data[subject][grade].update(standards)

        except Exception as e:
            console.print(f"[red]Error reading {json_file.name}: {e}[/red]")

    # Save merged file
    output_path = Path(output_file)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(merged_data, f, indent=2, ensure_ascii=False)

    # Summary
    total_standards = sum(
        len(standards)
        for subject_data in merged_data.values()
        for standards in subject_data.values()
    )

    console.print(Panel(
        f"[green]✓ Merge complete![/green]\n\n"
        f"Output file: [yellow]{output_path}[/yellow]\n"
        f"Total standards: [cyan]{total_standards}[/cyan]\n"
        f"Subjects: [magenta]{', '.join(sorted(merged_data.keys()))}[/magenta]",
        title="Merge Summary",
        border_style="green"
    ))


if __name__ == '__main__':
    cli()
