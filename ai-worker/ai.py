async def main(job: dict, role: str):
	"""Run the AI logic for one queued job."""
	if job.get("type") == "test":
		message = job.get("input", "")

		return {
			"message": f"Worker successfully processed: {message}",
			"worker": "ai-worker",
			"task_type": "test",
			"processed": True,
		}

	raise ValueError(f"Unknown job type: {job.get('type')}")
